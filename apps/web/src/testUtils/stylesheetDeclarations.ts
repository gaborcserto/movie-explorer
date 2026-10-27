import type postcss from 'postcss';

export function declarationsForSelector(
  stylesheet: postcss.Root,
  selector: string
) {
  const values: Record<string, string> = {};

  stylesheet.walkRules((rule) => {
    if (rule.parent?.type !== 'root' || !rule.selectors.includes(selector)) {
      return;
    }

    rule.walkDecls((declaration) => {
      values[declaration.prop] = declaration.value;
    });
  });

  return values;
}

export function declarationsForMedia(
  stylesheet: postcss.Root,
  selector: string,
  query: string
) {
  const values: Record<string, string> = {};

  stylesheet.walkAtRules('media', (media) => {
    if (
      query.includes('prefers-reduced-motion')
        ? !media.params.includes(query)
        : media.params !== query
    ) {
      return;
    }

    media.walkRules((rule) => {
      if (!rule.selectors.includes(selector)) {
        return;
      }

      rule.walkDecls((declaration) => {
        values[declaration.prop] = declaration.value;
      });
    });
  });

  return values;
}
