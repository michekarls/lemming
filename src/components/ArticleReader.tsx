import { useCallback, useRef, useState, useEffect } from 'react';
import { Article } from '../types';

interface ArticleReaderProps {
  article: Article;
  onWordClick: (word: string, sentence: string, position: { x: number; y: number }) => void;
  savedWords: string[];
}

interface WordInfo {
  id: string;
  word: string;
  sentence: string;
  paragraphIndex: number;
  sentenceIndex: number;
  tokenIndex: number;
}

function ArticleReader({ article, onWordClick, savedWords }: ArticleReaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const wordMapRef = useRef<Map<string, WordInfo>>(new Map());
  const wordElementsRef = useRef<Map<string, HTMLSpanElement>>(new Map());
  const dragStartId = useRef<string | null>(null);

  // Build ordered list of word IDs for range selection
  const getOrderedWordIds = useCallback(() => {
    const ids: string[] = [];
    const paragraphs = article.spanishContent.split('\n\n').filter(p => p.trim());
    paragraphs.forEach((paragraph, pIndex) => {
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      sentences.forEach((sentence, sIndex) => {
        const tokens = sentence.match(/[\w\u00C0-\u024F]+|[^\w\s]/g) || [];
        tokens.forEach((token, tIndex) => {
          if (/[\w\u00C0-\u024F]/.test(token)) {
            ids.push(`${pIndex}-${sIndex}-${tIndex}`);
          }
        });
      });
    });
    return ids;
  }, [article.spanishContent]);

  // Get all word IDs between two IDs (inclusive)
  const getWordIdsBetween = useCallback((startId: string, endId: string) => {
    const orderedIds = getOrderedWordIds();
    const startIdx = orderedIds.indexOf(startId);
    const endIdx = orderedIds.indexOf(endId);
    if (startIdx === -1 || endIdx === -1) return new Set<string>();

    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    return new Set(orderedIds.slice(minIdx, maxIdx + 1));
  }, [getOrderedWordIds]);

  const handleMouseDown = useCallback((e: React.MouseEvent, wordId: string) => {
    e.preventDefault(); // Prevent native text selection
    setIsDragging(true);
    dragStartId.current = wordId;
    setSelectedWordIds(new Set([wordId]));
  }, []);

  const handleMouseEnter = useCallback((wordId: string) => {
    if (isDragging && dragStartId.current) {
      const newSelection = getWordIdsBetween(dragStartId.current, wordId);
      setSelectedWordIds(newSelection);
    }
  }, [isDragging, getWordIdsBetween]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && selectedWordIds.size > 0) {
      // Get the selected words in order
      const orderedIds = getOrderedWordIds();
      const selectedOrdered = orderedIds.filter(id => selectedWordIds.has(id));

      if (selectedOrdered.length > 0) {
        // Build the phrase from selected words
        const words = selectedOrdered
          .map(id => wordMapRef.current.get(id)?.word)
          .filter(Boolean)
          .join(' ');

        // Get sentence context from the first selected word
        const firstWordInfo = wordMapRef.current.get(selectedOrdered[0]);
        const sentence = firstWordInfo?.sentence || '';

        // Calculate position from the selection bounds
        const elements = selectedOrdered
          .map(id => wordElementsRef.current.get(id))
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

    setIsDragging(false);
    setSelectedWordIds(new Set());
    dragStartId.current = null;
  }, [isDragging, selectedWordIds, getOrderedWordIds, onWordClick]);

  const handleWordClick = useCallback((
    e: React.MouseEvent<HTMLSpanElement>,
    word: string,
    sentence: string
  ) => {
    // Only handle if not dragging (single click)
    if (!isDragging && selectedWordIds.size === 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const position = {
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      };
      onWordClick(word, sentence, position);
    }
  }, [isDragging, selectedWordIds.size, onWordClick]);

  // Global mouseup listener to handle mouseup outside the component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, handleMouseUp]);

  const renderContent = () => {
    const paragraphs = article.spanishContent.split('\n\n').filter(p => p.trim());
    wordMapRef.current.clear();

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
                    const isSelected = selectedWordIds.has(wordId);

                    // Store word info for later lookup
                    wordMapRef.current.set(wordId, {
                      id: wordId,
                      word: token,
                      sentence: sentence.trim(),
                      paragraphIndex: pIndex,
                      sentenceIndex: sIndex,
                      tokenIndex: tIndex,
                    });

                    return (
                      <span
                        key={tIndex}
                        ref={(el) => {
                          if (el) wordElementsRef.current.set(wordId, el);
                        }}
                        className={`word ${isSaved ? 'saved' : ''} ${isSelected ? 'selecting' : ''}`}
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
  };

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
        style={{ userSelect: 'none' }}
      >
        {renderContent()}
      </div>
    </article>
  );
}

export default ArticleReader;
