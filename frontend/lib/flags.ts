/** "PK" -> 🇵🇰 using regional indicator symbols. */
export function countryFlag(countryCode: string): string {
  if (!/^[A-Za-z]{2}$/.test(countryCode)) return "🏳️";
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
