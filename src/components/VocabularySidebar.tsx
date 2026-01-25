import { VocabWord } from '../types';

interface VocabularySidebarProps {
  vocabulary: VocabWord[];
  onDelete: (id: string) => void;
}

function VocabularySidebar({ vocabulary, onDelete }: VocabularySidebarProps) {
  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h2 className="sidebar-title">
          My Vocabulary
          <span className="vocab-count">({vocabulary.length})</span>
        </h2>
      </header>

      {vocabulary.length === 0 ? (
        <div className="vocab-empty">
          <p>No words saved yet</p>
          <small>Click on words in the article and save them to build your vocabulary list.</small>
        </div>
      ) : (
        <div className="vocab-list">
          {vocabulary.map((word) => (
            <div key={word.id} className="vocab-item">
              <div className="vocab-item-header">
                <div>
                  <span className="vocab-spanish">{word.spanish}</span>
                  <span className="vocab-english"> — {word.english}</span>
                </div>
                <button
                  className="vocab-delete"
                  onClick={() => onDelete(word.id)}
                  title="Remove from vocabulary"
                >
                  &times;
                </button>
              </div>
              <div className="vocab-context">
                "{word.context}"
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

export default VocabularySidebar;
