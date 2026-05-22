# Duopara 📚

A dynamic reading platform that generates highly customized, topic-based texts controlled by your known vocabulary, featuring integrated tools for translation, pronunciation, and vocabulary management.

## Features

### 🎯 Text Generation Engine
- **Topic Seeding**: Generate texts about any topic you're interested in
- **Vocabulary Control**: Control the ratio of known vs. new words (e.g., 80% known / 20% new)
- **Dynamic Difficulty**: "Simplify" or "Make Harder" buttons to adjust text complexity
- **Multiple Styles**: Story, dialogue, article, or description formats

### 📖 Interactive Reading Interface
- **Word-Level Interaction**: Click any word to see translation, part of speech, and grammar info
- **Sentence-Level Interaction**: Double-click sentences for full translation with grammar notes
- **Mark as Learned**: Toggle words as learned to include them in future generation pools
- **Text-to-Speech**: Hear native pronunciation for words and sentences

### 🔤 Translation & Grammar Tools
- **Contextual Translation**: Translations consider the surrounding context
- **Grammar Hints**: AI-generated explanations for conjugations and grammatical structures
- **Part of Speech Tagging**: See if a word is a noun, verb, adjective, etc.
- **Base Form Display**: View the infinitive/singular form of conjugated words

### 📊 Vocabulary Management
- **CSV Import**: Import from Duolingo exports or custom word lists
- **Export**: Download your vocabulary as CSV
- **Progress Tracking**: See your learning/learned/mastered word counts
- **Word History**: Track how many times you've encountered each word

### 📈 Progress Dashboard
- **Reading Streaks**: Track your daily reading consistency
- **Words Mastered**: Monitor your vocabulary growth
- **Activity Heatmap**: Visualize your learning activity over time

## Tech Stack

- **Frontend**: Vue 3, TypeScript, Vite, TailwindCSS, TanStack Query, Pinia
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite with Prisma ORM
- **AI**: OpenAI GPT-4 for text generation and translation
- **TTS**: Web Speech API (browser-based)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd duopara
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# In packages/backend/.env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
OPENAI_API_KEY="your-openai-api-key"
PORT=3009
```

4. Initialize the database:
```bash
npm run db:push
```

5. Start the development servers:
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3009

### Docker-Isolated Development

Use this when you want `npm install` and other package experiments to stay away from the host machine. The project is copied into a Docker volume named `duopara_workspace`, so changes made inside the container do not modify this checkout.

Build the isolated image:
```bash
docker compose build
```

Open an isolated shell:
```bash
docker compose run --rm shell
```

Inside that shell, commands like `npm install`, `npm run build`, and `npm run db:push` run against the Docker volume, not the host project directory.

Run the Vue frontend and backend:
```bash
docker compose up backend frontend
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3009

If you want to reset the isolated workspace and database:
```bash
docker compose down -v
```

## Project Structure

```
duopara/
├── packages/
│   ├── backend/           # Express API server
│   │   ├── prisma/        # Database schema
│   │   └── src/
│   │       ├── routes/    # API endpoints
│   │       ├── middleware/ # Auth middleware
│   │       └── lib/       # Utilities
│   └── frontend/          # Vue application
│       └── src/
│           ├── components/ # Reusable components
│           ├── pages/      # Page components
│           ├── store/      # Zustand stores
│           └── lib/        # API client
└── package.json           # Root package.json (workspaces)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Text Generation
- `POST /api/generate` - Generate new text
- `POST /api/generate/regenerate` - Simplify or make text harder

### Vocabulary
- `GET /api/vocabulary` - List vocabulary
- `POST /api/vocabulary` - Add word
- `POST /api/vocabulary/import` - Import CSV
- `POST /api/vocabulary/mark-learned` - Mark word as learned

### Translation
- `POST /api/translate/word` - Translate word with context
- `POST /api/translate/sentence` - Translate sentence with grammar notes
- `POST /api/translate/full` - Full word analysis (translation + grammar)

### Statistics
- `GET /api/stats` - Get learning statistics
- `GET /api/stats/heatmap` - Get activity heatmap data
- `GET /api/stats/progress` - Get progress over time

## CSV Import Format

The vocabulary import supports Duolingo exports and custom formats:

```csv
word,translation,part_of_speech
hola,hello,interjection
comer,to eat,verb
```

Supported column names:
- `word`, `lexeme`, `term` - The vocabulary word
- `translation`, `meaning`, `english` - Translation
- `pos`, `part_of_speech` - Part of speech
- `base`, `baseform`, `lemma` - Base/infinitive form

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.
