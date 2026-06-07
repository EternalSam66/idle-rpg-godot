export function formatNumber(value: number): string {
  if (value < 1000) {
    return Math.floor(value).toString();
  }

  const suffixes: string[] = [];
  for (let i = 97; i <= 122; i++) {
    suffixes.push(String.fromCharCode(i));
  }

  const tier = Math.floor((Math.log10(value) - 3) / 3);

  if (tier >= suffixes.length) {
    return value.toExponential(2);
  }

  const suffix = suffixes[tier];
  const scaledValue = value / Math.pow(1000, tier + 1);

  return `${scaledValue.toFixed(2)}${suffix}`;
}
