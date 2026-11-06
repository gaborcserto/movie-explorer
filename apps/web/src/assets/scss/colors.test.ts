import { readFileSync } from 'node:fs';

const tokens = readFileSync('src/assets/scss/_colors.scss', 'utf8');

function token(name: string) {
  const value = tokens.match(new RegExp(`\\$${name}: (#[0-9a-f]{6});`))?.[1];

  if (!value) {
    throw new Error(`Missing color token: ${name}`);
  }

  return value;
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;

    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)];

  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

describe('canonical coral contrast', () => {
  it('preserves the approved original coral', () => {
    expect(token('red-1')).toBe('#f65261');
    expect(tokens).not.toMatch(/coral-text|coral-fill/);
  });

  it('uses readable neutral text on lighter grey surfaces', () => {
    expect(contrast(token('white'), token('grey-2'))).toBeGreaterThanOrEqual(
      4.5
    );
  });

  it.each(['black', 'grey-3'])('meets normal text AA on %s', (surface) => {
    expect(contrast(token('red-1'), token(surface))).toBeGreaterThanOrEqual(
      4.5
    );
  });

  it('records the white-on-coral design exception', () => {
    expect(contrast(token('white'), token('red-1'))).toBeCloseTo(3.33, 2);
  });

  it.each(['black', 'grey-3', 'grey-2'])(
    'retains visible brand outlines on %s',
    (surface) => {
      expect(contrast(token('red-1'), token(surface))).toBeGreaterThanOrEqual(
        3
      );
    }
  );
});
