export default function seasonName(number: number, title?: string) {
  const label = number === 0 ? 'Specials' : `Season ${number}`;

  return title && title.toLowerCase() !== label.toLowerCase()
    ? `${label}: ${title}`
    : label;
}
