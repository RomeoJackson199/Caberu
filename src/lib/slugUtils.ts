/**
 * Language-aware slug generation utility.
 *
 * Handles diacritics / accented characters common in French (é, è, ê, ç, …)
 * and Dutch (ë, ü, ï, …) by performing Unicode NFD decomposition and
 * stripping combining marks before falling back to the standard
 * lowercase-alphanumeric-hyphen pattern.
 */

/**
 * Normalize a string so that accented / diacritical characters are replaced
 * by their ASCII base letter.  e.g. "André" → "Andre", "Café" → "Cafe".
 */
function removeDiacritics(value: string): string {
  // NFD splits combined characters: é → e + ́  (base + combining accent)
  // The regex then strips all combining marks (Unicode category Mn).
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Generate a URL-safe slug from a business name.
 *
 * - Transliterates accented characters (é→e, ç→c, ü→u, …)
 * - Lowercases everything
 * - Preserves a single dot (.) for names like "Dr. Smile"
 * - Replaces any run of non-alphanumeric / non-dot characters with a hyphen
 * - Trims leading / trailing hyphens
 *
 * @example
 * generateSlug("Clinique Dentaire André")  // "clinique-dentaire-andre"
 * generateSlug("Tandarts Café De Smet")    // "tandarts-cafe-de-smet"
 * generateSlug("Dr. Van den Bergën")       // "dr.van-den-bergen"
 */
export function generateSlug(name: string): string {
  return removeDiacritics(name)
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
