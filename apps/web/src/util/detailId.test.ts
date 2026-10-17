import parseDetailId from './detailId';

it.each([
  '1e3',
  '0x10',
  '-1',
  '1.5',
  '0',
  '9007199254740992',
  ' 42',
  '42 ',
  '+42',
  '',
  'NaN',
])('rejects malformed detail ID %s', (value) => {
  expect(parseDetailId(value)).toBeNaN();
});

it.each(['1', '42', '00042', '9007199254740991'])(
  'accepts decimal ID %s',
  (value) => {
    expect(parseDetailId(value)).toBe(Number(value));
  }
);
