import { useRef, useCallback } from 'react';
import { Story } from '../types';
import { getGlobalPageNumber } from '../utils/storyParser';

interface StoryReaderProps {
  story: Story;
  chapterIndex: number;
  pageIndex: number;
  onWordClick: (word: string, sentence: string, position: { x: number; y: number }) => void;
  onPageChange: (chapterIndex: number, pageIndex: number) => void;
  savedWords: string[];
}

function StoryReader({
  story,
  chapterIndex,
  pageIndex,
  onWordClick,
  onPageChange,
  savedWords,
}: StoryReaderProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const currentChapter = story.chapters[chapterIndex];
  const currentPage = currentChapter?.pages[pageIndex];
  const globalPage = getGlobalPageNumber(story, chapterIndex, pageIndex);

  const canGoPrev = globalPage > 1;
  const canGoNext = globalPage < story.totalPages;

  const goToPrevPage = useCallback(() => {
    if (pageIndex > 0) {
      onPageChange(chapterIndex, pageIndex - 1);
    } else if (chapterIndex > 0) {
      const prevChapter = story.chapters[chapterIndex - 1];
      onPageChange(chapterIndex - 1, prevChapter.pages.length - 1);
    }
  }, [chapterIndex, pageIndex, onPageChange, story.chapters]);

  const goToNextPage = useCallback(() => {
    if (pageIndex < currentChapter.pages.length - 1) {
      onPageChange(chapterIndex, pageIndex + 1);
    } else if (chapterIndex < story.chapters.length - 1) {
      onPageChange(chapterIndex + 1, 0);
    }
  }, [chapterIndex, pageIndex, currentChapter, onPageChange, story.chapters.length]);

  const handleWordClick = useCallback((
    e: React.MouseEvent<HTMLSpanElement>,
    word: string,
    sentence: string
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    };
    onWordClick(word, sentence, position);
  }, [onWordClick]);

  const renderContent = () => {
    if (!currentPage) return null;

    const paragraphs = currentPage.content.split('\n\n').filter(p => p.trim());

    return paragraphs.map((paragraph, pIndex) => {
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];

      return (
        <p key={pIndex}>
          {sentences.map((sentence, sIndex) => {
            const tokens = sentence.match(/[\w\u00C0-\u024F]+|[^\w\s]/g) || [];

            return (
              <span key={sIndex}>
                {tokens.map((token, tIndex) => {
                  const isWord = /[\w\u00C0-\u024F]/.test(token);

                  if (isWord) {
                    const isSaved = savedWords.includes(token.toLowerCase());

                    return (
                      <span
                        key={tIndex}
                        data-sentence={sentence.trim()}
                        className={`word ${isSaved ? 'saved' : ''}`}
                        onClick={(e) => handleWordClick(e, token, sentence.trim())}
                      >
                        {token}
                      </span>
                    );
                  }

                  return <span key={tIndex}>{token}</span>;
                }).reduce((acc: React.ReactNode[], curr, idx) => {
                  if (idx === 0) return [curr];
                  const prev = tokens[idx - 1];
                  const current = tokens[idx];
                  if (/^[.!?,;:)]/.test(current)) return [...acc, curr];
                  if (/^[(]$/.test(prev)) return [...acc, curr];
                  return [...acc, ' ', curr];
                }, [])}
              </span>
            );
          })}
        </p>
      );
    });
  };

  // Calculate progress
  const progressPercent = (globalPage / story.totalPages) * 100;

  return (
    <article className="story-container">
      {/* Progress bar */}
      <div className="story-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="progress-info">
          <span className="progress-chapter">{currentChapter?.title}</span>
          <span className="progress-pages">
            Page {globalPage} of {story.totalPages}
          </span>
        </div>
      </div>

      {/* Story header */}
      <header className="story-header">
        <h2 className="story-title">{story.title}</h2>
        {story.author && <p className="story-author">por {story.author}</p>}
      </header>

      {/* Story content */}
      <div className="article-content" ref={contentRef}>
        {renderContent()}
      </div>

      {/* Navigation */}
      <nav className="story-navigation">
        <button
          className="btn btn-secondary"
          onClick={goToPrevPage}
          disabled={!canGoPrev}
        >
          ← Previous
        </button>
        <span className="page-indicator">
          {pageIndex + 1} / {currentChapter?.pages.length}
        </span>
        <button
          className="btn btn-secondary"
          onClick={goToNextPage}
          disabled={!canGoNext}
        >
          Next →
        </button>
      </nav>
    </article>
  );
}

export default StoryReader;
