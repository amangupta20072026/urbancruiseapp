/**
 * ------------------------------------------------------------------
 * Staff display names — alias vs full name
 * ------------------------------------------------------------------
 * UC staff go by an alias at work (saarthi.uc_staff.alias_name), e.g.
 * Abhishek Sharma is "Amit". The server sends both, already trimmed,
 * with the alias's first letter capitalised ('swara' → 'Swara').
 *
 *   List card      → alias, or the full name when there is no alias
 *   Contact sheet  → full name, with "Known as Amit" under it
 *   Manager row    → "Monu gehlot (Monu)"
 *
 * "Known as" and the manager's bracket are skipped when the alias only
 * repeats the first name (Muskan Gupta → "Muskan"): it would add
 * nothing. Compared case-insensitively ("MAYANK" vs "Mayank Babu").
 *
 * Pure functions, unit-tested in __tests__/displayName.test.ts.
 * ------------------------------------------------------------------
 */

const clean = (v: string | null | undefined): string => (v ?? '').trim();

/** First word of a full name. '' when there is no name. */
function firstWord(fullName: string): string {
  return clean(fullName).split(/\s+/)[0] ?? '';
}

/**
 * The alias, or null when it is missing or only repeats the first
 * word of `fullName`.
 */
function distinctAlias(
  alias: string | null | undefined,
  fullName: string | null | undefined,
): string | null {
  const a = clean(alias);
  if (!a) return null;
  const first = firstWord(clean(fullName));
  return first &&
    first.toLocaleLowerCase('en-IN') === a.toLocaleLowerCase('en-IN')
    ? null
    : a;
}

/** List-card title: the alias, else the full name. '' when neither. */
export function staffCardTitle(s: {
  aliasName: string | null;
  name: string;
}): string {
  return clean(s.aliasName) || clean(s.name);
}

/**
 * Line under the full name in the contact sheet, e.g. "Known as Amit".
 * null when there is no alias or it only repeats the first name.
 */
export function staffKnownAs(s: {
  aliasName: string | null;
  name: string;
}): string | null {
  const alias = distinctAlias(s.aliasName, s.name);
  return alias ? `Known as ${alias}` : null;
}

/**
 * Reporting-manager value: "Monu gehlot (Monu)". Just the full name
 * when the manager has no alias, or the alias only repeats the first
 * name. Just the alias when the full name is missing. null when there
 * is no manager.
 */
export function staffManagerLabel(s: {
  reportingManagerName: string | null;
  reportingManagerAlias: string | null;
}): string | null {
  const name = clean(s.reportingManagerName);
  const alias = distinctAlias(s.reportingManagerAlias, name);
  if (name && alias) return `${name} (${alias})`;
  return name || alias || null;
}
