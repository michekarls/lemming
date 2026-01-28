import { useState, useEffect, useCallback } from 'react';
import { Story, VocabWord, TranslationResult, TranslationCache } from './types';
import StoryReader from './components/StoryReader';
import VocabularySidebar from './components/VocabularySidebar';
import TranslationPopup from './components/TranslationPopup';
import {
  loadTranslationCache,
  saveTranslationCache,
  getCachedTranslation,
  cacheTranslation,
} from './utils/translationCache';
import { parseStoryMarkdown } from './utils/storyParser';

// Import stories
import proyectoAnochecerMd from './stories/proyecto_anochecer.md?raw';

const VOCAB_STORAGE_KEY = 'lemming-vocabulary';
const READING_PROGRESS_KEY = 'lemming-reading-progress';

// Parse available stories
const STORIES: Story[] = [
  parseStoryMarkdown(proyectoAnochecerMd, 'proyecto-anochecer'),
];

interface ReadingProgress {
  storyId: string;
  chapterIndex: number;
  pageIndex: number;
}

function App() {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);

  const [vocabulary, setVocabulary] = useState<VocabWord[]>([]);
  const [translationCache, setTranslationCache] = useState<TranslationCache>({});

  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    sentence: string;
    position: { x: number; y: number };
  } | null>(null);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [translating, setTranslating] = useState(false);

  // Load vocabulary and cache from localStorage on mount
  useEffect(() => {
    const savedVocab = localStorage.getItem(VOCAB_STORAGE_KEY);
    if (savedVocab) {
      try {
        setVocabulary(JSON.parse(savedVocab));
      } catch {
        console.error('Failed to parse saved vocabulary');
      }
    }

    setTranslationCache(loadTranslationCache());

    // Load reading progress
    const savedProgress = localStorage.getItem(READING_PROGRESS_KEY);
    if (savedProgress) {
      try {
        const progress: ReadingProgress = JSON.parse(savedProgress);
        const story = STORIES.find(s => s.id === progress.storyId);
        if (story) {
          setCurrentStory(story);
          setChapterIndex(progress.chapterIndex);
          setPageIndex(progress.pageIndex);
        }
      } catch {
        console.error('Failed to parse reading progress');
      }
    }
  }, []);

  // Save vocabulary to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(vocabulary));
  }, [vocabulary]);

  // Save reading progress
  useEffect(() => {
    if (currentStory) {
      const progress: ReadingProgress = {
        storyId: currentStory.id,
        chapterIndex,
        pageIndex,
      };
      localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(progress));
    }
  }, [currentStory, chapterIndex, pageIndex]);

  const handleSelectStory = (story: Story) => {
    setCurrentStory(story);
    setChapterIndex(0);
    setPageIndex(0);
  };

  const handlePageChange = useCallback((newChapter: number, newPage: number) => {
    setChapterIndex(newChapter);
    setPageIndex(newPage);
  }, []);

  const handleWordClick = useCallback(async (
    word: string,
    sentence: string,
    position: { x: number; y: number }
  ) => {
    setSelectedWord({ word, sentence, position });
    setTranslation(null);

    // Check cache first
    const cached = getCachedTranslation(translationCache, word, sentence);
    if (cached) {
      setTranslation(cached);
      return;
    }

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

      const data: TranslationResult = await response.json();
      setTranslation(data);

      // Cache the translation
      const newCache = cacheTranslation(translationCache, word, sentence, data);
      setTranslationCache(newCache);
      saveTranslationCache(newCache);
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
  }, [translationCache]);

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
          <p>Learn Spanish by reading stories</p>
        </header>

        {!currentStory && (
          <section className="story-selection">
            <h2>Select a Story</h2>
            <div className="story-list">
              {STORIES.map(story => (
                <button
                  key={story.id}
                  className="story-card"
                  onClick={() => handleSelectStory(story)}
                >
                  <h3>{story.title}</h3>
                  {story.author && <p className="story-card-author">por {story.author}</p>}
                  <p className="story-card-info">
                    {story.chapters.length} {story.chapters.length === 1 ? 'chapter' : 'chapters'} • {story.totalPages} pages
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {currentStory && (
          <>
            <div className="story-actions">
              <button
                className="btn btn-secondary btn-small"
                onClick={() => setCurrentStory(null)}
              >
                ← Back to stories
              </button>
            </div>
            <div className="hint">
              Click on any word to see its English translation
            </div>
            <StoryReader
              story={currentStory}
              chapterIndex={chapterIndex}
              pageIndex={pageIndex}
              onWordClick={handleWordClick}
              onPageChange={handlePageChange}
              savedWords={savedWords}
            />
          </>
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
