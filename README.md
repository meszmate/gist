# SmartNotes

A full-featured AI-powered learning platform that transforms your notes into interactive study materials with spaced repetition, analytics, AI tutoring, and more.

## Features

### Core Features
- **AI-Generated Content** - Upload notes (PDF, TXT, DOCX) or paste text to generate summaries, flashcards, and quizzes
- **Difficulty Levels** - Choose between Beginner, Standard, and Advanced difficulty
- **Customizable Output** - Control the number of flashcards (5-30) and quiz questions (3-15)

### Spaced Repetition System (SRS)
- **SM-2 Algorithm** - Scientifically-proven spaced repetition for optimal retention
- **Review Ratings** - Rate cards as Again/Hard/Good/Easy to optimize review intervals
- **Due Cards Tracking** - See which cards need review across all materials
- **Keyboard Shortcuts** - Space to flip, 1-4 for ratings, arrow keys for navigation

### Organization
- **Folders** - Organize materials into nested folders with custom colors
- **Tags** - Add tags to materials for easy filtering
- **Search** - Full-text search across all your study materials
- **Library View** - Browse all materials with filters and sorting

### Analytics Dashboard
- **Study Streak** - Track your daily learning streak
- **Cards Reviewed** - Monitor daily and total card reviews
- **Quiz Scores** - Track average quiz performance over time
- **Study Time** - See total time spent learning
- **Weak Topics** - Identify materials that need more attention

### AI Tutor Chat
- **Context-Aware** - AI tutor has full context of your study material
- **Streaming Responses** - Real-time streaming for natural conversation
- **Chat History** - Persistent conversation history per material
- **Rate Limited** - 20 messages per day on free tier

### Additional Features
- **Pomodoro Timer** - Built-in productivity timer (25min work / 5min break)
- **Dark Mode** - Full dark theme support with system preference detection
- **i18n** - Hungarian (primary) and English language support
- **Export** - Download materials as Anki decks (.apkg) or PDF study guides
- **Sharing** - Generate public share links for your materials

### Authentication
- **Google OAuth** - Sign in with Google (no email/password)
- **JWT Tokens** - Secure token-based authentication with refresh tokens
- **Per-User Rate Limiting** - Fair usage limits for free service

## Tech Stack

### Backend
- **Go 1.25** with Gin framework
- **PostgreSQL** for data persistence
- **JWT** for authentication
- **OpenAI GPT-4o Mini** for AI generation

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS v4** for styling
- **shadcn/ui** components
- **Framer Motion** for animations
- **i18next** for internationalization
- **Recharts** for analytics charts

## Getting Started

### Prerequisites
- Go 1.25+
- Node.js 20+ with pnpm
- PostgreSQL 15+
- Google OAuth credentials
- OpenAI API key

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/meszmate/smartnotes.git
cd smartnotes
```

2. Create a PostgreSQL database:
```bash
createdb smartnotes
```

3. Create `.env` file in the root directory:
```env
# OpenAI
API_KEY=sk-proj-...

# Cloudflare Turnstile
TURNSTILE_SECRET=1x0000000000000000000000000000000AA

# Server
PORT=8080
OPEN=false

# Database
DATABASE_URL=postgres://user:password@localhost:5432/smartnotes

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URL=http://localhost:8080/auth/google/callback

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Rate Limits (optional)
MAX_GENERATIONS_PER_DAY=5
MAX_TOKENS_PER_DAY=50000
MAX_CHAT_MESSAGES_PER_DAY=20

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

4. Run the backend:
```bash
go run cmd/main.go
```

### Frontend Setup

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
pnpm install
```

3. Create `.env` file:
```env
VITE_API_URL=http://localhost:8080
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

4. Start the development server:
```bash
pnpm dev
```

5. Open http://localhost:5173 in your browser

## Project Structure

```
smartnotes/
├── cmd/
│   └── main.go                 # Application entry point
├── internal/
│   ├── api/                    # HTTP handlers
│   │   ├── router.go
│   │   ├── middleware/auth.go
│   │   ├── auth.go
│   │   ├── materials.go
│   │   ├── flashcards.go
│   │   ├── quiz.go
│   │   ├── srs.go
│   │   ├── folders.go
│   │   ├── analytics.go
│   │   ├── chat.go
│   │   └── export.go
│   ├── config/config.go        # Configuration
│   ├── db/                     # Database layer
│   │   ├── db.go
│   │   ├── migrate.go
│   │   └── migrations/
│   ├── models/                 # Data models
│   ├── repository/             # Data access layer
│   ├── pkg/
│   │   ├── ai/client.go        # OpenAI client
│   │   ├── auth/               # OAuth & JWT
│   │   ├── srs/sm2.go          # SM-2 algorithm
│   │   ├── export/             # Anki & PDF export
│   │   └── captcha/            # Turnstile verification
│   └── errx/                   # Error handling
└── web/
    └── src/
        ├── components/
        │   ├── auth/
        │   ├── chat/
        │   ├── timer/
        │   ├── settings/
        │   └── ui/
        ├── hooks/
        │   ├── useAuth.tsx
        │   ├── useTheme.tsx
        │   ├── useKeyboardShortcuts.tsx
        │   └── usePomodoro.tsx
        ├── pages/
        │   ├── Dashboard.tsx
        │   ├── Library.tsx
        │   ├── StudySession.tsx
        │   └── Settings.tsx
        └── lib/
            ├── i18n/
            │   └── locales/
            │       ├── hu.json
            │       └── en.json
            ├── api.ts
            └── types.ts
```

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Materials
- `GET /materials` - List materials
- `POST /materials` - Create material (AI generation)
- `GET /materials/:id` - Get material
- `PATCH /materials/:id` - Update material
- `DELETE /materials/:id` - Delete material
- `POST /materials/:id/share` - Generate share link

### Flashcards & Quiz
- `POST /materials/:id/flashcards` - Add flashcard
- `PATCH /materials/:id/flashcards/:cardId` - Edit flashcard
- `DELETE /materials/:id/flashcards/:cardId` - Delete flashcard
- `POST /materials/:id/quiz` - Add quiz question
- `POST /materials/:id/quiz/submit` - Submit quiz answers

### SRS
- `GET /srs/due` - Get due cards
- `POST /srs/review` - Submit card rating
- `GET /srs/stats` - Get SRS statistics

### Organization
- `GET /folders` - List folders
- `POST /folders` - Create folder
- `GET /tags` - List tags
- `POST /tags` - Create tag

### Analytics
- `GET /analytics/overview` - Dashboard stats
- `GET /analytics/streak` - Streak data
- `GET /analytics/progress` - Progress charts

### Chat
- `GET /chat/:materialId` - Get chat history
- `POST /chat/:materialId` - Send message (SSE stream)
- `DELETE /chat/:materialId` - Clear history

### Export
- `GET /export/anki/:id` - Download Anki deck
- `GET /export/pdf/:id` - Download PDF

## Keyboard Shortcuts

### Study Session
| Key | Action |
|-----|--------|
| `Space` | Flip card |
| `←` / `→` | Previous / Next card |
| `1` | Rate: Again |
| `2` | Rate: Hard |
| `3` | Rate: Good |
| `4` | Rate: Easy |

### Quiz
| Key | Action |
|-----|--------|
| `1-4` | Select answer option |
| `Enter` | Submit answer |

### Global
| Key | Action |
|-----|--------|
| `Ctrl+K` | Open search |
| `Ctrl+N` | New material |
| `Ctrl+S` | Start study session |

## License

MIT © 2025
