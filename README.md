# Lemming - Spanish Reading Practice

A language learning app that helps you practice Spanish by reading real news articles translated to B1 (intermediate) level.

## Features

- **News-Based Learning**: Fetches real news articles and translates them to B1 Spanish
- **Click-to-Translate**: Click any word to see its English translation with context
- **Vocabulary Builder**: Save words to your personal vocabulary list
- **Persistent Storage**: Your vocabulary persists across browser sessions
- **B1 Level Content**: Articles are simplified for intermediate learners

## Getting Started

### Prerequisites

- Node.js 18+
- An Anthropic API key

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

3. Start the development server:

```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

## How It Works

1. **Enter a topic** (or leave blank for random news)
2. **Click "Get Article"** to fetch and translate a news story
3. **Read the Spanish text** - click any word you don't know
4. **View translations** with the word's meaning and full sentence context
5. **Save words** to your vocabulary for later review

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js
- **AI**: Anthropic Claude API (for translations and B1 simplification)
- **Storage**: localStorage for vocabulary persistence

## Project Structure

```
lemming/
├── src/
│   ├── components/
│   │   ├── ArticleReader.tsx    # Displays article with clickable words
│   │   ├── TranslationPopup.tsx # Shows word translation
│   │   └── VocabularySidebar.tsx# Shows saved vocabulary
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   ├── App.tsx                  # Main app component
│   ├── index.css                # Styles
│   └── main.tsx                 # Entry point
├── server/
│   └── index.ts                 # Express API server
├── package.json
└── vite.config.ts
```

## API Endpoints

- `POST /api/fetch-article` - Fetch and translate a news article
  - Body: `{ topic?: string }`
  - Returns: Article with Spanish B1 content

- `POST /api/translate-word` - Translate a word with context
  - Body: `{ word: string, sentence: string }`
  - Returns: Translation with context

## License

MIT
