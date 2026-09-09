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
  const remainder = description.startsWith(title) ? description.slice(title.length) : description;
  const trimmed = remainder.trim();
  return trimmed.length > 0 ? trimmed : null;
}
