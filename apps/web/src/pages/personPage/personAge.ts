function parseDate(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return undefined;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  if (
    year < 1 ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return { year, month, day, date };
}

export default function getPersonAge(
  birthday?: string,
  deathDate?: string,
  today = new Date()
): number | undefined {
  const birth = parseDate(birthday);

  if (!birth || Number.isNaN(today.getTime())) {
    return undefined;
  }

  const deceased = Boolean(deathDate?.trim());
  const end = deceased ? parseDate(deathDate) : undefined;

  if (deceased && !end) {
    return undefined;
  }

  const reference = end?.date ?? today;

  if (reference < birth.date) {
    return undefined;
  }

  let age = reference.getFullYear() - birth.year;

  if (
    reference.getMonth() + 1 < birth.month ||
    (reference.getMonth() + 1 === birth.month &&
      reference.getDate() < birth.day)
  ) {
    age -= 1;
  }

  return age;
}
