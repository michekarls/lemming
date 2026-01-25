import { useCallback } from 'react';
import { Article } from '../types';

interface ArticleReaderProps {
  article: Article;
  onWordClick: (word: string, sentence: string, position: { x: number; y: number }) => void;
  savedWords: string[];
}

function ArticleReader({ article, onWordClick, savedWords }: ArticleReaderProps) {
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
    const paragraphs = article.spanishContent.split('\n\n').filter(p => p.trim());

    return paragraphs.map((paragraph, pIndex) => {
      // Split paragraph into sentences (rough approximation)
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];

      return (
        <p key={pIndex}>
          {sentences.map((sentence, sIndex) => {
            // Split sentence into words while preserving punctuation
            const tokens = sentence.match(/[\w\u00C0-\u024F]+|[^\w\s]/g) || [];

            return (
              <span key={sIndex}>
                {tokens.map((token, tIndex) => {
                  // Check if token is a word (contains letters)
                  const isWord = /[\w\u00C0-\u024F]/.test(token);

                  if (isWord) {
                    const isSaved = savedWords.includes(token.toLowerCase());
                    return (
                      <span
                        key={tIndex}
                        className={`word ${isSaved ? 'saved' : ''}`}
                        onClick={(e) => handleWordClick(e, token, sentence.trim())}
                      >
                        {token}
                      </span>
                    );
                  }

                  // Punctuation or space
                  return <span key={tIndex}>{token}</span>;
                }).reduce((acc: React.ReactNode[], curr, idx) => {
                  // Add spaces between words
                  if (idx === 0) return [curr];
                  const prev = tokens[idx - 1];
                  const current = tokens[idx];
                  // Don't add space before punctuation
                  if (/^[.!?,;:)]/.test(current)) return [...acc, curr];
                  // Don't add space after opening punctuation
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

      <div className="article-content">
        {renderContent()}
      </div>
    </article>
  );
}

export default ArticleReader;
