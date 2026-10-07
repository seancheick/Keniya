/** Display wording only: keep stored evidence and authenticated approval records intact. */
export function reviewTeamText(text: string): string {
  return text.replace(/\bclinician\b/gi, "PharmaGuide Team")
    .replace(/\bclinical (review|decision|approval|changes)\b/gi, "PharmaGuide Team $1");
}

export function reviewTeamRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [reviewTeamText(key), typeof value === "string" ? reviewTeamText(value) : value]));
}
