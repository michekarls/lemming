export interface Article {
  title: string;
  titleSpanish: string;
  originalSource: string;
  spanishContent: string;
  fetchedAt: string;
}

export interface VocabWord {
  id: string;
  spanish: string;
  english: string;
  context: string;
  savedAt: string;
}

export interface TranslationResult {
  word: string;
  translation: string;
  context: string;
  contextTranslation: string;
}
