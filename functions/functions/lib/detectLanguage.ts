import { franc } from "npm:franc@6.2.0";

export function detectLanguage(text) {
  try {
    const langCode = franc(text || "", { minLength: 3 });
    if (langCode === "und") return "en";
    // franc returns 3 letter codes, we might want 2 letter for some APIs,
    // but standardizing on what franc returns (ISO 639-3) is fine for storage.
    // Mapping to 2 char if needed for specific APIs can be done there.
    return langCode;
  } catch (e) {
    console.warn("Language detection failed, defaulting to en", e);
    return "en";
  }
}
