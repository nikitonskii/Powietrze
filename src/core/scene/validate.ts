export function assertFiniteIndex(v: number): void {
  if (!Number.isFinite(v)) {
    throw new RangeError(`CAQI index must be a finite number, got: ${v}`);
  }
}
