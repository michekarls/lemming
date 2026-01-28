import { TranslationResult, TranslationCache } from '../types';

const CACHE_STORAGE_KEY = 'lemming-translation-cache';
const MAX_CACHE_SIZE = 1000; // Max number of cached translations

/**
 * Get the cache key for a word and its context
 */
function getCacheKey(word: string, sentence: string): string {
  // Use lowercase word and first 50 chars of sentence for key
  return `${word.toLowerCase()}:${sentence.slice(0, 50)}`;
}

/**
 * Load translation cache from localStorage
 */
export function loadTranslationCache(): TranslationCache {
  try {
    const cached = localStorage.getItem(CACHE_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Failed to load translation cache:', error);
  }
  return {};
}

/**
 * Save translation cache to localStorage
 */
export function saveTranslationCache(cache: TranslationCache): void {
  try {
    // Trim cache if too large
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_SIZE) {
      // Keep only the most recent entries (last MAX_CACHE_SIZE)
      const trimmedCache: TranslationCache = {};
      const recentKeys = keys.slice(-MAX_CACHE_SIZE);
      for (const key of recentKeys) {
        trimmedCache[key] = cache[key];
      }
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(trimmedCache));
    } else {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
    }
  } catch (error) {
    console.error('Failed to save translation cache:', error);
  }
}

/**
 * Get a cached translation if available
 */
export function getCachedTranslation(
  cache: TranslationCache,
  word: string,
  sentence: string
): TranslationResult | null {
  const key = getCacheKey(word, sentence);
  return cache[key] || null;
}

/**
 * Add a translation to the cache
 */
export function cacheTranslation(
  cache: TranslationCache,
  word: string,
  sentence: string,
  translation: TranslationResult
): TranslationCache {
  const key = getCacheKey(word, sentence);
  return {
    ...cache,
    [key]: translation,
  };
}

/**
 * Clear the translation cache
 */
export function clearTranslationCache(): void {
  localStorage.removeItem(CACHE_STORAGE_KEY);
}
