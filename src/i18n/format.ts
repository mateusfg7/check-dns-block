/** Zero-pads `n` to two digits. Shared by every locale's `formatDateTime` and by `report.ts`. */
export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}
