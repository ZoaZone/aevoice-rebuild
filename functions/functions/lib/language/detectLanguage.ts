// lib/language/detectLanguage.js

import { logger } from "../infra/logger.js";

// Language detection patterns
const LANGUAGE_PATTERNS = {
  // CJK languages
  zh: /[\u4e00-\u9fff]/,
  ja: /[\u3040-\u309f\u30a0-\u30ff]/,
  ko: /[\uac00-\ud7af\u1100-\u11ff]/,

  // RTL languages
  ar: /[\u0600-\u06ff]/,
  he: /[\u0590-\u05ff]/,
  fa: /[\u0600-\u06ff\u0750-\u077f]/,

  // Cyrillic
  ru: /[\u0400-\u04ff]/,

  // South Asian
  hi: /[\u0900-\u097f]/,
  ta: /[\u0b80-\u0bff]/,
  te: /[\u0c00-\u0c7f]/,

  // Thai/Vietnamese
  th: /[\u0e00-\u0e7f]/,
  vi: /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i,

  // Greek
  el: /[\u0370-\u03ff]/,
};

// Common words for European languages
const LANGUAGE_KEYWORDS = {
  es: [
    "hola",
    "como",
    "está",
    "qué",
    "gracias",
    "buenos",
    "días",
    "por",
    "favor",
    "señor",
  ],
  fr: [
    "bonjour",
    "comment",
    "merci",
    "s'il",
    "vous",
    "plaît",
    "monsieur",
    "madame",
    "oui",
    "non",
  ],
  de: [
    "guten",
    "tag",
    "danke",
    "bitte",
    "wie",
    "geht",
    "herr",
    "frau",
    "ja",
    "nein",
  ],
  it: [
    "ciao",
    "buongiorno",
    "grazie",
    "prego",
    "come",
    "stai",
    "signore",
    "signora",
  ],
  pt: [
    "olá",
    "como",
    "obrigado",
    "por",
    "favor",
    "senhor",
    "senhora",
    "bom",
    "dia",
  ],
  nl: ["hallo", "goedendag", "dank", "alstublieft", "meneer", "mevrouw"],
  pl: ["cześć", "dzień", "dobry", "dziękuję", "proszę", "pan", "pani"],
  tr: ["merhaba", "nasıl", "teşekkür", "ederim", "lütfen", "bey", "hanım"],
};

/**
 * Detects the language of a given text.
 * Returns { language: string, confidence: number }
 */
export function detectLanguage(text) {
  if (!text || typeof text !== "string") {
    return { language: "en", confidence: 0.5 };
  }

  const cleanText = text.trim().toLowerCase();

  if (cleanText.length < 3) {
    return { language: "en", confidence: 0.3 };
  }

  try {
    // Check script-based patterns first (high confidence)
    for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
      const matches = cleanText.match(pattern);
      if (matches && matches.length > 0) {
        const coverage = matches.join("").length /
          cleanText.replace(/\s/g, "").length;
        if (coverage > 0.3) {
          logger.debug("Language detected by script pattern", {
            language: lang,
            coverage,
          });
          return {
            language: lang,
            confidence: Math.min(0.95, 0.7 + coverage * 0.3),
          };
        }
      }
    }

    // Check keyword-based patterns for European languages
    const words = cleanText.split(/\s+/);
    for (const [lang, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
      const matchCount = words.filter((word) => keywords.includes(word)).length;
      if (matchCount >= 2 || (matchCount >= 1 && words.length <= 5)) {
        const confidence = Math.min(
          0.85,
          0.5 + (matchCount / words.length) * 0.5,
        );
        logger.debug("Language detected by keywords", {
          language: lang,
          matchCount,
          confidence,
        });
        return { language: lang, confidence };
      }
    }

    // Default to English
    return { language: "en", confidence: 0.6 };
  } catch (err) {
    logger.warn("Language detection failed", { error: err.message });
    return { language: "en", confidence: 0.5 };
  }
}

/**
 * Gets the display name for a language code
 */
export function getLanguageName(code) {
  const names = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    nl: "Dutch",
    pl: "Polish",
    ru: "Russian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    he: "Hebrew",
    hi: "Hindi",
    th: "Thai",
    vi: "Vietnamese",
    tr: "Turkish",
    el: "Greek",
  };
  return names[code] || code;
}
