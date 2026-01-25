import { useEffect, useRef } from 'react';
import { TranslationResult } from '../types';

interface TranslationPopupProps {
  position: { x: number; y: number };
  translation: TranslationResult | null;
  loading: boolean;
  onClose: () => void;
  onSave: (translation: TranslationResult) => void;
  isSaved: boolean;
}

function TranslationPopup({
  position,
  translation,
  loading,
  onClose,
  onSave,
  isSaved,
}: TranslationPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Position the popup
  useEffect(() => {
    if (!popupRef.current) return;

    const popup = popupRef.current;
    const rect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x - rect.width / 2;
    let y = position.y;

    // Keep popup within viewport horizontally
    if (x < 10) x = 10;
    if (x + rect.width > viewportWidth - 10) {
      x = viewportWidth - rect.width - 10;
    }

    // If popup would go below viewport, show it above the word
    if (y + rect.height > viewportHeight - 10) {
      y = position.y - rect.height - 50;
    }

    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
  }, [position, translation, loading]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div className="translation-popup" ref={popupRef}>
      {loading ? (
        <div className="popup-loading">
          <div className="spinner" style={{ width: 24, height: 24 }} />
          <span style={{ marginLeft: 8 }}>Translating...</span>
        </div>
      ) : translation ? (
        <>
          <div className="popup-header">
            <span className="popup-word">{translation.word}</span>
            <button className="popup-close" onClick={onClose}>
              &times;
            </button>
          </div>

          <div className="popup-translation">
            {translation.translation}
          </div>

          <div className="popup-context">
            "{translation.context}"
          </div>

          {translation.contextTranslation && (
            <div className="popup-context-translation">
              {translation.contextTranslation}
            </div>
          )}

          <div className="popup-actions">
            {isSaved ? (
              <button className="btn btn-secondary btn-small" disabled>
                Already Saved
              </button>
            ) : (
              <button
                className="btn btn-success btn-small"
                onClick={() => onSave(translation)}
              >
                Save to Vocabulary
              </button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default TranslationPopup;
