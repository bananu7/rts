export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    if (value === null || value === undefined) return false;
    const testDummy: TValue = value;
    return true;
}

export function isErrnoException(e: unknown): e is NodeJS.ErrnoException {
  if ('code' in (e as any)) return true;
  else return false;
}
