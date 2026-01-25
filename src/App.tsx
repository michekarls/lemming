import { useState, useEffect, useCallback } from 'react';
import { Article, VocabWord, TranslationResult } from './types';
import ArticleReader from './components/ArticleReader';
import VocabularySidebar from './components/VocabularySidebar';
import TranslationPopup from './components/TranslationPopup';

const VOCAB_STORAGE_KEY = 'lemming-vocabulary';

function App() {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState('');

  const [vocabulary, setVocabulary] = useState<VocabWord[]>([]);

  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    sentence: string;
    position: { x: number; y: number };
  } | null>(null);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [translating, setTranslating] = useState(false);

  // Load vocabulary from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(VOCAB_STORAGE_KEY);
    if (saved) {
      try {
        setVocabulary(JSON.parse(saved));
      } catch {
        console.error('Failed to parse saved vocabulary');
      }
    }
  }, []);

  // Save vocabulary to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(vocabulary));
  }, [vocabulary]);

  const fetchArticle = async (searchTopic?: string) => {
    setLoading(true);
    setError(null);
    setArticle(null);

    try {
      const response = await fetch('/api/fetch-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: searchTopic || topic || undefined }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch article');
      }

      const data = await response.json();
      setArticle(data);
    } catch (err) {
      setError('Failed to fetch article. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWordClick = useCallback(async (
    word: string,
    sentence: string,
    position: { x: number; y: number }
  ) => {
    setSelectedWord({ word, sentence, position });
    setTranslation(null);
    setTranslating(true);

    try {
      const response = await fetch('/api/translate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, sentence }),
      });

      if (!response.ok) {
        throw new Error('Failed to translate');
      }

      const data = await response.json();
      setTranslation(data);
    } catch (err) {
      console.error('Translation error:', err);
      setTranslation({
        word,
        translation: 'Translation failed',
        context: sentence,
        contextTranslation: '',
      });
    } finally {
      setTranslating(false);
    }
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedWord(null);
    setTranslation(null);
  }, []);

  const handleSaveWord = useCallback((wordData: TranslationResult) => {
    const newVocab: VocabWord = {
      id: `${wordData.word}-${Date.now()}`,
      spanish: wordData.word,
      english: wordData.translation,
      context: wordData.context,
      savedAt: new Date().toISOString(),
    };

    setVocabulary(prev => {
      // Don't add duplicates (same word + same context)
      const exists = prev.some(
        v => v.spanish.toLowerCase() === newVocab.spanish.toLowerCase() &&
             v.context === newVocab.context
      );
      if (exists) return prev;
      return [newVocab, ...prev];
    });

    handleClosePopup();
  }, [handleClosePopup]);

  const handleDeleteWord = useCallback((id: string) => {
    setVocabulary(prev => prev.filter(v => v.id !== id));
  }, []);

  const savedWords = vocabulary.map(v => v.spanish.toLowerCase());

  return (
    <div className="app">
      <div className="main-content">
        <header className="header">
          <h1>Lemming</h1>
          <p>Learn Spanish by reading real news articles</p>
        </header>

        <section className="topic-section">
          <form
            className="topic-form"
            onSubmit={(e) => { e.preventDefault(); fetchArticle(); }}
          >
            <input
              type="text"
              className="topic-input"
              placeholder="Enter a topic (e.g., technology, sports, climate)..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Get Article'}
            </button>
          </form>
        </section>

        {error && (
          <div className="error">{error}</div>
        )}

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <p>Fetching and translating article...</p>
            <small>This may take a moment</small>
          </div>
        )}

        {article && !loading && (
          <>
            <div className="hint">
              Click on any word to see its English translation
            </div>
            <ArticleReader
              article={article}
              onWordClick={handleWordClick}
              savedWords={savedWords}
            />
          </>
        )}

        {!article && !loading && !error && (
          <div className="article-container">
            <div className="empty-state">
              <h3>Ready to practice your Spanish?</h3>
              <p>Enter a topic above or click "Get Article" for a random news story.</p>
            </div>
          </div>
        )}

        {selectedWord && (
          <TranslationPopup
            position={selectedWord.position}
            translation={translation}
            loading={translating}
            onClose={handleClosePopup}
            onSave={handleSaveWord}
            isSaved={savedWords.includes(selectedWord.word.toLowerCase())}
          />
        )}
      </div>

      <VocabularySidebar
        vocabulary={vocabulary}
        onDelete={handleDeleteWord}
      />
    </div>
  );
}

export default App;
