export function fail(code, cause) {
  const error = new Error(code, cause ? { cause } : undefined);
  error.code = code;
  throw error;
}

export function requireText(value, code = 'MISSING_FIELD') {
  if (typeof value !== 'string' || value.trim() === '') fail(code);
  return value;
}
