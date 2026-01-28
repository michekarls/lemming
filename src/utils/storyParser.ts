import { Story, StoryChapter, StoryPage } from '../types';

const TARGET_WORDS_PER_PAGE = 250; // 200-300 words
const MIN_WORDS_PER_PAGE = 200;
const MAX_WORDS_PER_PAGE = 300;

/**
 * Split text into pages of 200-300 words, never breaking mid-sentence
 */
function splitIntoPages(text: string): StoryPage[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const pages: StoryPage[] = [];
  let currentPageContent = '';
  let currentWordCount = 0;
  let pageNumber = 1;

  for (const sentence of sentences) {
    const sentenceWordCount = sentence.trim().split(/\s+/).length;

    // If adding this sentence would exceed max and we already have min words, start new page
    if (currentWordCount + sentenceWordCount > MAX_WORDS_PER_PAGE && currentWordCount >= MIN_WORDS_PER_PAGE) {
      pages.push({
        content: currentPageContent.trim(),
        pageNumber: pageNumber++,
      });
      currentPageContent = sentence;
      currentWordCount = sentenceWordCount;
    } else {
      currentPageContent += sentence;
      currentWordCount += sentenceWordCount;
    }
  }

  // Don't forget the last page
  if (currentPageContent.trim()) {
    pages.push({
      content: currentPageContent.trim(),
      pageNumber: pageNumber,
    });
  }

  return pages;
}

/**
 * Parse a markdown story file into a Story object
 * Expected format:
 * # Story Title
 *
 * ## Chapter 1: Chapter Title
 *
 * Story content...
 *
 * ## Chapter 2: Another Chapter
 *
 * More content...
 */
export function parseStoryMarkdown(markdown: string, storyId: string): Story {
  const lines = markdown.split('\n');
  let title = 'Untitled Story';
  let author: string | undefined;
  let description: string | undefined;
  const chapters: StoryChapter[] = [];

  let currentChapter: { title: string; content: string } | null = null;
  let inFrontMatter = false;
  let contentBuffer: string[] = [];

  for (const line of lines) {
    // Check for story title (# heading)
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      title = line.slice(2).trim();
      continue;
    }

    // Check for author line
    if (line.toLowerCase().startsWith('author:') || line.toLowerCase().startsWith('por:')) {
      author = line.split(':').slice(1).join(':').trim();
      continue;
    }

    // Check for chapter heading (## heading)
    if (line.startsWith('## ')) {
      // Save previous chapter if exists
      if (currentChapter) {
        const chapterContent = contentBuffer.join('\n').trim();
        if (chapterContent) {
          chapters.push({
            title: currentChapter.title,
            chapterNumber: chapters.length + 1,
            pages: splitIntoPages(chapterContent),
          });
        }
      }

      // Start new chapter
      currentChapter = {
        title: line.slice(3).trim(),
        content: '',
      };
      contentBuffer = [];
      continue;
    }

    // Accumulate content
    if (currentChapter) {
      contentBuffer.push(line);
    } else if (line.trim() && !title) {
      // Content before first chapter might be description
      description = (description || '') + line + ' ';
    }
  }

  // Don't forget the last chapter
  if (currentChapter) {
    const chapterContent = contentBuffer.join('\n').trim();
    if (chapterContent) {
      chapters.push({
        title: currentChapter.title,
        chapterNumber: chapters.length + 1,
        pages: splitIntoPages(chapterContent),
      });
    }
  }

  // If no chapters were found, treat the entire content as one chapter
  if (chapters.length === 0) {
    const allContent = markdown
      .replace(/^#\s+.+$/m, '') // Remove title
      .replace(/^author:.+$/im, '') // Remove author
      .replace(/^por:.+$/im, '') // Remove author (Spanish)
      .trim();

    if (allContent) {
      chapters.push({
        title: 'Chapter 1',
        chapterNumber: 1,
        pages: splitIntoPages(allContent),
      });
    }
  }

  // Calculate total pages
  const totalPages = chapters.reduce((sum, ch) => sum + ch.pages.length, 0);

  return {
    id: storyId,
    title,
    author,
    description: description?.trim(),
    chapters,
    totalPages,
  };
}

/**
 * Get global page number from chapter and page indices
 */
export function getGlobalPageNumber(story: Story, chapterIndex: number, pageIndex: number): number {
  let pageNum = 0;
  for (let i = 0; i < chapterIndex; i++) {
    pageNum += story.chapters[i].pages.length;
  }
  return pageNum + pageIndex + 1;
}

/**
 * Get chapter and page indices from global page number
 */
export function getChapterAndPage(story: Story, globalPage: number): { chapterIndex: number; pageIndex: number } {
  let remaining = globalPage - 1;
  for (let i = 0; i < story.chapters.length; i++) {
    if (remaining < story.chapters[i].pages.length) {
      return { chapterIndex: i, pageIndex: remaining };
    }
    remaining -= story.chapters[i].pages.length;
  }
  // Default to last page
  const lastChapter = story.chapters.length - 1;
  return {
    chapterIndex: lastChapter,
    pageIndex: story.chapters[lastChapter].pages.length - 1,
  };
}
