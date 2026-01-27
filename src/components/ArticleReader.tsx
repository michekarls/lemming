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

  // Get word ID from a DOM element
  const getWordIdFromElement = useCallback((element: Element | null): string | null => {
    if (!element) return null;
    const wordEl = element.closest('[data-word-id]');
    return wordEl?.getAttribute('data-word-id') || null;
  }, []);

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
  const finishDrag = useCallback(() => {
    if (!isDraggingRef.current) return;

    const startId = dragStartIdRef.current;
    const endId = dragEndIdRef.current;

    if (startId && endId) {
      const orderedIds = orderedWordIdsRef.current;
      const startIdx = orderedIds.indexOf(startId);
      const endIdx = orderedIds.indexOf(endId);

      if (startIdx !== -1 && endIdx !== -1) {
        const minIdx = Math.min(startIdx, endIdx);
        const maxIdx = Math.max(startIdx, endIdx);
        const selectedIds = orderedIds.slice(minIdx, maxIdx + 1);

        if (selectedIds.length > 0) {
          const words = selectedIds
            .map(id => wordMapRef.current.get(id)?.word)
            .filter(Boolean)
            .join(' ');

          const firstWordInfo = wordMapRef.current.get(selectedIds[0]);
          const sentence = firstWordInfo?.sentence || '';

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
    }

    // Clear selection highlighting
    wordMapRef.current.forEach((info) => {
      info.element.classList.remove('selecting');
    });

    isDraggingRef.current = false;
    dragStartIdRef.current = null;
    dragEndIdRef.current = null;
  }, [onWordClick]);

  // Set up mouse event listeners on the content area
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const handleMouseDown = (e: MouseEvent) => {
      const wordId = getWordIdFromElement(e.target as Element);
      if (wordId) {
        e.preventDefault();
        isDraggingRef.current = true;
        dragStartIdRef.current = wordId;
        dragEndIdRef.current = wordId;
        updateSelectionHighlight();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const wordId = getWordIdFromElement(e.target as Element);
      if (wordId && wordId !== dragEndIdRef.current) {
        dragEndIdRef.current = wordId;
        updateSelectionHighlight();
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        finishDrag();
      }
    };

    const preventSelection = (e: Event) => {
      e.preventDefault();
    };

    content.addEventListener('mousedown', handleMouseDown);
    content.addEventListener('mousemove', handleMouseMove);
    content.addEventListener('selectstart', preventSelection);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      content.removeEventListener('mousedown', handleMouseDown);
      content.removeEventListener('mousemove', handleMouseMove);
      content.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [getWordIdFromElement, updateSelectionHighlight, finishDrag]);

  // Build ordered word list and render content
  const content = (() => {
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
                        data-word-id={wordId}
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
  })();

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
        {content}
      </div>
    </article>
  );
}

export default ArticleReader;
