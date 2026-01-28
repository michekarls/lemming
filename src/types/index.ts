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

// Story types
export interface StoryPage {
  content: string;
  pageNumber: number;
}

export interface StoryChapter {
  title: string;
  chapterNumber: number;
  pages: StoryPage[];
}

export interface Story {
  id: string;
  title: string;
  author?: string;
  description?: string;
  chapters: StoryChapter[];
  totalPages: number;
}

// Translation cache
export interface TranslationCache {
  [key: string]: TranslationResult; // key is `${word}:${sentenceContext}`
}
