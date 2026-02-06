# gist

An AI-powered study platform built with Next.js. Create flashcards, quizzes, and summaries from your study materials using AI or build them manually.

## Features

- **AI-Powered Content Generation** - Generate flashcards, quizzes, and summaries from uploaded documents or text
- **Multiple Question Types** - Support for 8 built-in question types:
  - Multiple Choice
  - True/False
  - Text Input
  - Year Range (with partial credit)
  - Numeric Range (with tolerance)
  - Matching
  - Fill in the Blank
  - Multi-Select
- **Custom Question Types** - Create your own question types with custom validation rules
- **Flexible Grading System** - Percentage, letter grades, pass/fail, or points-based grading
- **Partial Credit Support** - Configurable tolerance for numeric and year-based questions
- **Quiz Sharing** - Share quizzes via link with participant tracking
- **Participant Dashboard** - View scores, grades, time spent, and export results to CSV
- **Spaced Repetition** - Flashcard study mode with spaced repetition algorithm
- **Dark Mode** - Full dark mode support

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js v5 (Auth.js)
- **AI**: OpenAI GPT-4o-mini
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Radix UI
- **State Management**: TanStack Query (React Query)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/meszmate/gist.git
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
   - Database connection string
   - Auth secret (generate with `openssl rand -base64 32`)
   - Google OAuth credentials
   - OpenAI API key

5. Set up the database:
```bash
pnpm db:push
```

6. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `AUTH_SECRET` | NextAuth.js secret key | Yes |
| `AUTH_URL` | App URL for auth callbacks | Yes |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | Yes |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI features | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL for share links | Yes |
| `NEXT_PUBLIC_REPOSITORY_URL` | GitHub repository URL (shows in sidebar) | No |

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:push` | Push schema to database (dev) |
| `pnpm db:studio` | Open Drizzle Studio |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── (public)/          # Public pages
│   ├── api/               # API routes
│   └── q/                 # Public quiz taking
├── components/
│   ├── quiz/              # Quiz-related components
│   │   └── question-renderers/  # Question type renderers
│   ├── shared/            # Shared components
│   └── ui/                # shadcn/ui components
└── lib/
    ├── ai/                # AI integration (OpenAI)
    ├── auth/              # Authentication config
    ├── db/                # Database schema & connection
    ├── quiz/              # Quiz services (grading, validation)
    └── types/             # TypeScript type definitions
```

## Database Schema

Key tables:
- `users` - User accounts
- `study_materials` - Quizzes, flashcard sets, notes
- `quiz_questions` - Questions with flexible type system
- `quiz_attempts` - Participant attempts and scores
- `flashcards` - Flashcard front/back content
- `grading_configs` - Per-quiz grading settings
- `question_types` - Custom question type definitions

## API Routes

### Quizzes
- `GET /api/quizzes` - List user's quizzes
- `POST /api/quizzes` - Create quiz
- `GET /api/quizzes/[id]` - Get quiz details
- `PUT /api/quizzes/[id]` - Update quiz
- `DELETE /api/quizzes/[id]` - Delete quiz

### Questions
- `GET /api/quizzes/[id]/questions` - List questions
- `POST /api/quizzes/[id]/questions` - Create question
- `PATCH /api/quizzes/[id]/questions` - Reorder questions
- `PUT /api/quizzes/[id]/questions/[qid]` - Update question
- `DELETE /api/quizzes/[id]/questions/[qid]` - Delete question

### Attempts & Participants
- `POST /api/quizzes/[id]/attempt` - Submit quiz attempt
- `GET /api/quizzes/[id]/participants` - Get participant list & stats
- `GET /api/quizzes/[id]/participants?format=csv` - Export to CSV

### Grading
- `GET /api/quizzes/[id]/grading` - Get grading config
- `PUT /api/quizzes/[id]/grading` - Update grading config

### Sharing
- `GET /api/shared/[token]` - Get shared quiz
- `POST /api/shared/[token]/attempt` - Submit as guest

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

#### Using Docker Compose (Recommended)

The easiest way to run gist with Docker:

```bash
# Copy environment file and configure
cp .env.example .env
# Edit .env with your values

# Start the app and database
docker-compose up -d

# Run database migrations
pnpm db:push
```

The app will be available at [http://localhost:3000](http://localhost:3000).

#### Building Docker Image Manually

```bash
# Build the image
docker build -t gist .

# Run the container
docker run -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e AUTH_SECRET="your-auth-secret" \
  -e AUTH_GOOGLE_ID="your-google-id" \
  -e AUTH_GOOGLE_SECRET="your-google-secret" \
  -e OPENAI_API_KEY="your-openai-key" \
  gist
```

## License

[MIT](./LICENSE)
