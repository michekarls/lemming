import { useCallback, useRef, useEffect } from 'react';
import { Article } from '../types';

interface ArticleReaderProps {
  article: Article;
  onWordClick: (word: string, sentence: string, position: { x: number; y: number }) => void;
  savedWords: string[];
}

interface WordInfo {
  word: string;
  sentence: string;
  element: HTMLSpanElement;
}

function ArticleReader({ article, onWordClick, savedWords }: ArticleReaderProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const wordMapRef = useRef<Map<string, WordInfo>>(new Map());
  const isDraggingRef = useRef(false);
  const dragStartIdRef = useRef<string | null>(null);
  const dragEndIdRef = useRef<string | null>(null);
  const orderedWordIdsRef = useRef<string[]>([]);

  // Update selection highlighting
  const updateSelectionHighlight = useCallback(() => {
    const startId = dragStartIdRef.current;
    const endId = dragEndIdRef.current;

    // Clear all selections first
    wordMapRef.current.forEach((info) => {
      info.element.classList.remove('selecting');
    });

    if (!startId || !endId) return;

    const orderedIds = orderedWordIdsRef.current;
    const startIdx = orderedIds.indexOf(startId);
    const endIdx = orderedIds.indexOf(endId);
    if (startIdx === -1 || endIdx === -1) return;

    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);

    for (let i = minIdx; i <= maxIdx; i++) {
      const info = wordMapRef.current.get(orderedIds[i]);
      if (info) {
        info.element.classList.add('selecting');
      }
    }
  }, []);

  // Handle drag end - trigger translation
  const handleDragEnd = useCallback(() => {
    const startId = dragStartIdRef.current;
    const endId = dragEndIdRef.current;

    if (!startId || !endId) {
      isDraggingRef.current = false;
      return;
    }

    const orderedIds = orderedWordIdsRef.current;
    const startIdx = orderedIds.indexOf(startId);
    const endIdx = orderedIds.indexOf(endId);

    if (startIdx !== -1 && endIdx !== -1) {
      const minIdx = Math.min(startIdx, endIdx);
      const maxIdx = Math.max(startIdx, endIdx);
      const selectedIds = orderedIds.slice(minIdx, maxIdx + 1);

      if (selectedIds.length > 0) {
        // Build the phrase from selected words
        const words = selectedIds
          .map(id => wordMapRef.current.get(id)?.word)
          .filter(Boolean)
          .join(' ');

        // Get sentence context from the first selected word
        const firstWordInfo = wordMapRef.current.get(selectedIds[0]);
        const sentence = firstWordInfo?.sentence || '';

        // Calculate position from the selection bounds
        const elements = selectedIds
          .map(id => wordMapRef.current.get(id)?.element)
          .filter(Boolean) as HTMLSpanElement[];

        if (elements.length > 0) {
          const firstRect = elements[0].getBoundingClientRect();
          const lastRect = elements[elements.length - 1].getBoundingClientRect();
          const position = {
            x: (firstRect.left + lastRect.right) / 2,
            y: Math.max(firstRect.bottom, lastRect.bottom) + 8,
          };

          onWordClick(words, sentence, position);
        }
      }
    }

    // Clear selection highlighting
    wordMapRef.current.forEach((info) => {
      info.element.classList.remove('selecting');
    });

    isDraggingRef.current = false;
    dragStartIdRef.current = null;
    dragEndIdRef.current = null;
  }, [onWordClick]);

  // Global mouseup listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        handleDragEnd();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleDragEnd]);

  // Prevent native selection
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const preventSelection = (e: Event) => {
      e.preventDefault();
    };

    content.addEventListener('selectstart', preventSelection);
    return () => content.removeEventListener('selectstart', preventSelection);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, wordId: string) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartIdRef.current = wordId;
    dragEndIdRef.current = wordId;
    updateSelectionHighlight();
  }, [updateSelectionHighlight]);

  const handleMouseEnter = useCallback((wordId: string) => {
    if (isDraggingRef.current) {
      dragEndIdRef.current = wordId;
      updateSelectionHighlight();
    }
  }, [updateSelectionHighlight]);

  const handleWordClick = useCallback((
    e: React.MouseEvent<HTMLSpanElement>,
    word: string,
    sentence: string
  ) => {
    // Only handle single clicks when not dragging across multiple words
    if (dragStartIdRef.current === dragEndIdRef.current && dragStartIdRef.current !== null) {
      // Single word was clicked (start and end are the same)
      const rect = e.currentTarget.getBoundingClientRect();
      const position = {
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      };
      onWordClick(word, sentence, position);
    }
  }, [onWordClick]);

  const renderContent = useCallback(() => {
    const paragraphs = article.spanishContent.split('\n\n').filter(p => p.trim());
    wordMapRef.current.clear();
    orderedWordIdsRef.current = [];

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
                    const wordId = `${pIndex}-${sIndex}-${tIndex}`;
                    const isSaved = savedWords.includes(token.toLowerCase());
                    orderedWordIdsRef.current.push(wordId);

                    return (
                      <span
                        key={tIndex}
                        ref={(el) => {
                          if (el) {
                            wordMapRef.current.set(wordId, {
                              word: token,
                              sentence: sentence.trim(),
                              element: el,
                            });
                          }
                        }}
                        className={`word ${isSaved ? 'saved' : ''}`}
                        onMouseDown={(e) => handleMouseDown(e, wordId)}
                        onMouseEnter={() => handleMouseEnter(wordId)}
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
  }, [article.spanishContent, savedWords, handleMouseDown, handleMouseEnter, handleWordClick]);

  return (
    <article className="article-container">
      <header className="article-header">
        <h2 className="article-title">{article.titleSpanish}</h2>
        <div className="article-meta">
          <span>Original: {article.title}</span>
          <span>Source: {article.originalSource}</span>
        </div>
      </header>

      <div className="article-content" ref={contentRef}>
        {renderContent()}
      </div>
    </article>
  );
}

export default ArticleReader;
