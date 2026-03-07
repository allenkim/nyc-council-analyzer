export function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[*#]+/g, "") // strip * and #
    .replace(/\b(inc|llc|corp|ltd|co)\b\.?/gi, "") // strip corporate suffixes
    .replace(/\d+$/g, "") // strip trailing numbers
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}
