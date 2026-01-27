import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic();

// Strip citation tags from web search results
function stripCitations(text: string): string {
  return text
    // Spaced citation tags like < cite index = " 14 - 4 " >
    .replace(/<\s*cite[^>]*>/gi, ' ')
    .replace(/<\s*\/\s*cite\s*>/gi, ' ')
    .replace(/<\s*source[^>]*>/gi, ' ')
    .replace(/<\s*\/\s*source\s*>/gi, ' ')
    // Unicode bracket citations like 【1†source】
    .replace(/【[^】]*】/g, ' ')
    // Square bracket citations like [1], [1,2], [source]
    .replace(/\[\d+(?:,\s*\d+)*\]/g, ' ')
    .replace(/\[citation needed\]/gi, ' ')
    // Superscript-style references
    .replace(/\^\[\d+\]/g, ' ')
    // Clean up spacing - collapse multiple spaces to single
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Fetch and translate a news article to B1 Spanish
app.post('/api/fetch-article', async (req, res) => {
  try {
    const { topic } = req.body;
    const searchTopic = topic || 'world news today';

    // Use Claude to fetch news and translate to B1 Spanish
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are a Spanish language teacher creating reading materials for B1 (intermediate) learners.

TASK:
1. First, search for a recent news article about: "${searchTopic}"
2. Then rewrite it in Spanish at B1 level

B1 LEVEL REQUIREMENTS:
- Use simple, clear sentence structures (avoid complex subordinate clauses)
- Replace advanced vocabulary with common B1-level words
- Keep sentences short (10-15 words maximum)
- Use present tense and simple past primarily
- Avoid idioms and regional expressions
- Target 200-400 words total

OUTPUT FORMAT (respond with ONLY this JSON, no other text):
{
  "title": "Original English headline",
  "titleSpanish": "Spanish headline at B1 level",
  "originalSource": "Brief description of the news source/topic",
  "spanishContent": "The full article in B1 Spanish. Use multiple paragraphs separated by \\n\\n for readability."
}`
        }
      ],
      tools: [
        {
          type: 'web_search_20250305' as const,
          name: 'web_search',
          max_uses: 3
        }
      ]
    });

    // Extract the text response
    let articleJson = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        articleJson = block.text;
        break;
      }
    }

    // Parse the JSON response
    const jsonMatch = articleJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse article response');
    }

    const article = JSON.parse(jsonMatch[0]);

    // Strip citation tags from all text fields
    article.title = stripCitations(article.title || '');
    article.titleSpanish = stripCitations(article.titleSpanish || '');
    article.originalSource = stripCitations(article.originalSource || '');
    article.spanishContent = stripCitations(article.spanishContent || '');
    article.fetchedAt = new Date().toISOString();

    res.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch and translate article' });
  }
});

// Translate a word with context
app.post('/api/translate-word', async (req, res) => {
  try {
    const { word, sentence } = req.body;

    if (!word || !sentence) {
      return res.status(400).json({ error: 'Word and sentence are required' });
    }

    const isPhrase = word.includes(' ');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Translate this Spanish ${isPhrase ? 'phrase' : 'word'} to English, considering its context.

${isPhrase ? 'PHRASE' : 'WORD'}: "${word}"
CONTEXT SENTENCE: "${sentence}"

Respond with ONLY this JSON format, no other text:
{
  "word": "${word}",
  "translation": "English translation of the ${isPhrase ? 'phrase' : 'word'} (just the ${isPhrase ? 'phrase' : 'word'}, not the full sentence)",
  "context": "${sentence}",
  "contextTranslation": "Full English translation of the context sentence"
}`
        }
      ]
    });

    // Extract the text response
    let translationJson = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        translationJson = block.text;
        break;
      }
    }

    // Parse the JSON response
    const jsonMatch = translationJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse translation response');
    }

    const translation = JSON.parse(jsonMatch[0]);

    // Strip any citation tags
    translation.translation = stripCitations(translation.translation || '');
    translation.contextTranslation = stripCitations(translation.contextTranslation || '');

    res.json(translation);
  } catch (error) {
    console.error('Error translating word:', error);
    res.status(500).json({ error: 'Failed to translate word' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
