export function sanitizeUserInput(text) {
  if (!text) return "";
  // Remove obvious HTML tags
  const noHtml = text.replace(/<[^>]*>/g, "");
  // Normalize whitespace
  const normalized = noHtml.replace(/\s+/g, " ").trim();
  return normalized.slice(0, 2000);
}
