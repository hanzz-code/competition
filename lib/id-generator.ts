/**
 * Generate XID - globally unique, URL-safe, sortable identifier
 */
export function generateXID(): string {
  const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";
  let result = "";
  for (let i = 0; i < 20; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return result;
}

export const generateId = generateXID;

export function isValidXID(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  const xidRegex = /^[0-9a-hjkmnp-tv-z]{20}$/;
  return xidRegex.test(id);
}
