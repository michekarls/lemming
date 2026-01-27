import { useRef, useCallback } from 'react';
import { Article } from '../types';

interface ArticleReaderProps {
  article: Article;
  onWordClick: (word: string, sentence: string, position: { x: number; y: number }) => void;
  savedWords: string[];
}

function ArticleReader({ article, onWordClick, savedWords }: ArticleReaderProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartIdRef = useRef<string | null>(null);
  const dragEndIdRef = useRef<string | null>(null);

  const getWordIdFromPoint = useCallback((x: number, y: number): string | null => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;
    const wordEl = element.closest('[data-word-id]');
    return wordEl?.getAttribute('data-word-id') || null;
  }, []);

  const updateSelectionHighlight = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    const allWords = Array.from(content.querySelectorAll('[data-word-id]'));
    const startId = dragStartIdRef.current;
    const endId = dragEndIdRef.current;

    // Clear all selections
    allWords.forEach(el => el.classList.remove('selecting'));

    if (!startId || !endId) return;

    const startEl = content.querySelector(`[data-word-id="${startId}"]`);
    const endEl = content.querySelector(`[data-word-id="${endId}"]`);
    if (!startEl || !endEl) return;

    const startIdx = allWords.indexOf(startEl);
    const endIdx = allWords.indexOf(endEl);
    if (startIdx === -1 || endIdx === -1) return;

    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);

    for (let i = minIdx; i <= maxIdx; i++) {
      allWords[i].classList.add('selecting');
    }
  }, []);

  const finishDrag = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    const allWords = Array.from(content.querySelectorAll('[data-word-id]')) as HTMLElement[];
    const startId = dragStartIdRef.current;
    const endId = dragEndIdRef.current;

    // Clear highlighting
    allWords.forEach(el => el.classList.remove('selecting'));

    if (startId && endId) {
      const startEl = content.querySelector(`[data-word-id="${startId}"]`);
      const endEl = content.querySelector(`[data-word-id="${endId}"]`);

      if (startEl && endEl) {
        const startIdx = allWords.indexOf(startEl as HTMLElement);
        const endIdx = allWords.indexOf(endEl as HTMLElement);

        if (startIdx !== -1 && endIdx !== -1) {
          const minIdx = Math.min(startIdx, endIdx);
          const maxIdx = Math.max(startIdx, endIdx);
          const selectedElements = allWords.slice(minIdx, maxIdx + 1);

          if (selectedElements.length > 0) {
            const words = selectedElements
              .map(el => el.textContent)
              .filter(Boolean)
              .join(' ');

            const sentence = selectedElements[0].getAttribute('data-sentence') || '';

            const firstRect = selectedElements[0].getBoundingClientRect();
            const lastRect = selectedElements[selectedElements.length - 1].getBoundingClientRect();
            const position = {
              x: (firstRect.left + lastRect.right) / 2,
              y: Math.max(firstRect.bottom, lastRect.bottom) + 8,
            };

            onWordClick(words, sentence, position);
          }
        }
      }
    }

    isDraggingRef.current = false;
    dragStartIdRef.current = null;
    dragEndIdRef.current = null;
  }, [onWordClick]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const wordId = getWordIdFromPoint(e.clientX, e.clientY);
    if (wordId) {
      e.preventDefault();
      isDraggingRef.current = true;
      dragStartIdRef.current = wordId;
      dragEndIdRef.current = wordId;
      updateSelectionHighlight();
    }
  }, [getWordIdFromPoint, updateSelectionHighlight]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const wordId = getWordIdFromPoint(e.clientX, e.clientY);
    if (wordId && wordId !== dragEndIdRef.current) {
      dragEndIdRef.current = wordId;
      updateSelectionHighlight();
    }
  }, [getWordIdFromPoint, updateSelectionHighlight]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      finishDrag();
    }
  }, [finishDrag]);

  const handleMouseLeave = useCallback(() => {
    // Don't cancel drag when leaving - user might come back
  }, []);

  const paragraphs = article.spanishContent.split('\n\n').filter(p => p.trim());

  return (
    <article className="article-container">
      <header className="article-header">
        <h2 className="article-title">{article.titleSpanish}</h2>
        <div className="article-meta">
          <span>Original: {article.title}</span>
          <span>Source: {article.originalSource}</span>
        </div>
      </header>

      <div
        className="article-content"
        ref={contentRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {paragraphs.map((paragraph, pIndex) => {
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

                        return (
                          <span
                            key={tIndex}
                            data-word-id={wordId}
                            data-sentence={sentence.trim()}
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
        })}
      </div>
    </article>
  );
}

export default ArticleReader;
