const assert = require('node:assert/strict');
const { test } = require('node:test');
const { normalizeMobile, toE164, toIndianNational } = require('../utils/phone');

test('normalises the equivalent Indian formats to one E.164 value', () => {
  const variants = [
    '9876543210',
    '09876543210',
    '98765 43210',
    '98765-43210',
    '+91 98765 43210',
    '+919876543210',
    '0091 9876543210',
    '  9876543210  ',
  ];
  variants.forEach((variant) => {
    const result = normalizeMobile(variant);
    assert.equal(result.valid, true, `"${variant}" should be valid`);
    assert.equal(result.e164, '+919876543210', `"${variant}" should normalise to +919876543210`);
  });
});

test('keeps international numbers that carry an explicit country code', () => {
  const cases = [
    ['+14155552671', '+14155552671', 'US'],
    ['+44 20 7946 0958', '+442079460958', 'GB'],
    ['+971 50 123 4567', '+971501234567', 'AE'],
  ];
  cases.forEach(([input, expected, country]) => {
    const result = normalizeMobile(input);
    assert.equal(result.valid, true, `"${input}" should be valid`);
    assert.equal(result.e164, expected);
    assert.equal(result.country, country);
  });
});

test('does not silently reinterpret a "+" number as an Indian number', () => {
  // With default country IN, "4155552671" would be an Indian number, but the
  // explicitly international form must stay a US number.
  assert.equal(toE164('+14155552671'), '+14155552671');
  assert.notEqual(toE164('+14155552671'), toE164('4155552671'));
  assert.equal(toE164('4155552671'), '+914155552671');
});

test('rejects empty, malformed and out-of-range numbers', () => {
  ['', '   ', null, undefined, 'abc', '1234', '+91', '99999999999999999999', '0000000'].forEach((input) => {
    const result = normalizeMobile(input);
    assert.equal(result.valid, false, `"${String(input)}" should be invalid`);
    assert.equal(result.e164, null);
  });
});

test('exposes the country calling code and national number', () => {
  const result = normalizeMobile('9876543210');
  assert.equal(result.countryCallingCode, '91');
  assert.equal(result.nationalNumber, '9876543210');
});

test('toIndianNational returns the national form only for Indian numbers', () => {
  assert.equal(toIndianNational('+91 98765 43210'), '9876543210');
  assert.equal(toIndianNational('+14155552671'), null);
});

test('honours an explicit default country argument', () => {
  assert.equal(toE164('4155552671', 'US'), '+14155552671');
  assert.equal(toE164('9876543210', 'IN'), '+919876543210');
});
