export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}
