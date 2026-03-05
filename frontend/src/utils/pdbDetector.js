export function extractPDB(text) {

  const regex = /\b[0-9][A-Za-z0-9]{3}\b/g;

  const matches = text.match(regex);

  if (!matches) return null;

  return matches[0].toLowerCase();
}