/**
 * The backend derives a complaint's title by truncating its description
 * (first ~80 chars or up to the first newline - see ComplaintFactory.
 * extractTitle), so description always starts with the title verbatim.
 * Showing both in full is pure repetition. This returns only the part of
 * the description NOT already covered by the title - null if there's
 * nothing left to show (the whole message fit in the title).
 */
export function descriptionRemainder(title: string, description?: string | null): string | null {
  if (!description) {
    return null;
  }
  if (!description.startsWith(title)) {
    return description.trim() || null;
  }

  let cut = title.length;
  // Some already-stored titles were truncated mid-word (fixed going
  // forward on the backend, but old data can still have it) - a plain
  // slice at title.length would then start the remainder with a broken
  // word fragment ("ease Check..." instead of "please Check..."). Detect
  // that by checking whether there's a real word boundary right at the
  // cut point, and if not, back up to the last space in the full
  // description so the whole word shows instead of half of it.
  if (cut > 0 && cut < description.length && /\S/.test(description[cut - 1]) && /\S/.test(description[cut])) {
    const lastSpace = description.lastIndexOf(' ', cut - 1);
    cut = lastSpace === -1 ? 0 : lastSpace;
  }

  const remainder = description.slice(cut).trim();
  return remainder.length > 0 ? remainder : null;
}
