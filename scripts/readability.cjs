const ts = require('typescript');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

function boundaries(text, filename = 'fixture.tsx') {
  const source = ts.createSourceFile(
    filename,
    text,
    ts.ScriptTarget.Latest,
    true,
  );

  if (source.parseDiagnostics.length) {
    throw new SyntaxError(`Cannot inspect invalid syntax in ${filename}`);
  }

  const gaps = [];

  function functionValue(node) {
    if (!node) {
      return false;
    }

    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      return true;
    }

    if (ts.isParenthesizedExpression(node)) {
      return functionValue(node.expression);
    }

    if (!ts.isCallExpression(node)) {
      return false;
    }

    const name = ts.isIdentifier(node.expression)
      ? node.expression.text
      : ts.isPropertyAccessExpression(node.expression)
        ? node.expression.name.text
        : undefined;

    if (name === 'useCallback') {
      return functionValue(node.arguments[0]);
    }

    if (name !== 'useMemo') {
      return false;
    }

    const factory = node.arguments[0];

    if (
      !factory ||
      (!ts.isArrowFunction(factory) && !ts.isFunctionExpression(factory))
    ) {
      return false;
    }

    if (!ts.isBlock(factory.body)) {
      return functionValue(factory.body);
    }

    return factory.body.statements.some(
      (statement) =>
        ts.isReturnStatement(statement) && functionValue(statement.expression),
    );
  }

  function inspect(nodes) {
    nodes.forEach((node, index) => {
      if (!index) {
        return;
      }

      const previous = nodes[index - 1];

      if (
        ts.isFunctionDeclaration(node) &&
        ts.isFunctionDeclaration(previous) &&
        !previous.body &&
        node.name?.text === previous.name?.text
      ) {
        return;
      }
      const importBoundary =
        ts.isImportDeclaration(node) &&
        ts.isImportDeclaration(previous) &&
        node.importClause &&
        previous.importClause &&
        node.moduleSpecifier.text.startsWith('.') !==
          previous.moduleSpecifier.text.startsWith('.');
      const functionVariable =
        ts.isVariableStatement(node) &&
        node.declarationList.declarations.some(({ initializer }) =>
          functionValue(initializer),
        );
      const required =
        importBoundary ||
        functionVariable ||
        (ts.isFunctionDeclaration(node) && !!node.body) ||
        (ts.isFunctionDeclaration(previous) && !!previous.body) ||
        ts.isMethodDeclaration(node) ||
        ts.isConstructorDeclaration(node) ||
        ts.isReturnStatement(node) ||
        (ts.isVariableStatement(previous) &&
          (ts.isIfStatement(node) ||
            ts.isTryStatement(node) ||
            ts.isIterationStatement(node, false) ||
            ts.isSwitchStatement(node)));

      if (!required) {
        return;
      }

      const start = previous.end;
      const end = node.getStart(source);
      const gap = text.slice(start, end);
      // Comments and same-line statements need contextual review. Never move them.
      if (!/^\s*$/.test(gap) || !gap.includes('\n')) {
        return;
      }

      if (gap.split('\n').length !== 3) {
        gaps.push({ start, end });
      }
    });
  }

  function visit(node) {
    if (ts.isSourceFile(node) || ts.isBlock(node) || ts.isModuleBlock(node)) {
      inspect(node.statements);
    }

    if (ts.isCaseClause(node) || ts.isDefaultClause(node)) {
      inspect(node.statements);
    }

    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      inspect(node.members);
    }

    ts.forEachChild(node, visit);
  }

  visit(source);

  return gaps;
}

function format(text, filename) {
  return boundaries(text, filename)
    .sort((a, b) => b.start - a.start)
    .reduce((result, gap) => {
      const whitespace = result.slice(gap.start, gap.end);
      const newline = whitespace.includes('\r\n') ? '\r\n' : '\n';
      const indent = whitespace.slice(whitespace.lastIndexOf('\n') + 1);

      return (
        result.slice(0, gap.start) +
        newline +
        newline +
        indent +
        result.slice(gap.end)
      );
    }, text);
}

if (require.main === module) {
  const files = [
    ...new Set([
      ...execFileSync(
        'git',
        ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
        { encoding: 'utf8' },
      ).split('\0'),
    ]),
  ].filter(
    (file) =>
      fs.existsSync(file) &&
      /\.(?:[cm]?jsx?|tsx?)$/.test(file) &&
      !/(?:^|\/)(?:dist|coverage|node_modules|vendor|\.notes)\//.test(file),
  );
  let failures = 0;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const gaps = boundaries(text, file);

    if (process.argv.includes('--write')) {
      fs.writeFileSync(file, format(text, file));
    } else if (gaps.length) {
      console.error(`${file}: ${gaps.length} readability spacing boundaries`);
      failures += gaps.length;
    }
  }

  console.log(
    `Inspected ${files.length} source files; ${failures} spacing violations.`,
  );
  process.exitCode = failures ? 1 : 0;
}

module.exports = { boundaries, format };
