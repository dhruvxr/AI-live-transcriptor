const QUESTION_KEYWORDS = [
  "what",
  "who",
  "when",
  "where",
  "why",
  "how",
  "is",
  "are",
  "do",
  "does",
  "did",
  "can",
  "could",
  "will",
  "would",
  "should",
  "which",
  "tell me about",
  "explain",
];

export const isQuestion = (text: string): boolean => {
  const normalizedText = text.toLowerCase().trim();

  if (normalizedText.endsWith("?")) {
    return true;
  }

  return QUESTION_KEYWORDS.some((keyword) =>
    normalizedText.startsWith(keyword + " ")
  );
};
