import getPersonAge from './personAge';

describe('getPersonAge', () => {
  const today = new Date(2026, 5, 15);

  it('accounts for whether the birthday has passed this year', () => {
    expect(getPersonAge('2000-06-14', undefined, today)).toBe(26);
    expect(getPersonAge('2000-06-16', undefined, today)).toBe(25);
  });

  it('omits age when the birthday is absent or invalid', () => {
    expect(getPersonAge(undefined, undefined, today)).toBeUndefined();
    expect(getPersonAge('2000-02-30', undefined, today)).toBeUndefined();
    expect(getPersonAge('not-a-date', undefined, today)).toBeUndefined();
  });

  it('uses age at death and never falls back to current age for a deceased person', () => {
    expect(getPersonAge('2000-06-16', '2024-06-15', today)).toBe(23);
    expect(getPersonAge('2000-06-16', '2000-06-16', today)).toBe(0);
    expect(
      getPersonAge('2000-06-16', 'invalid-death-date', today)
    ).toBeUndefined();
  });
});
