# Lemming - Language Learning App Plan

## Overview

A modern language learning app with vocabulary lessons, quizzes, spaced repetition, and gamification.

---

## 1. Core Features

### MVP Features (P0)
- User authentication (email/password, OAuth)
- Language selection (native + target language)
- Vocabulary system with translations and audio
- Structured lessons with progressive difficulty
- Basic quizzes (multiple choice, matching, fill-in-blank)
- Progress tracking with XP and streaks

### Core Features (P1)
- Spaced Repetition System (SM-2 algorithm)
- Speech recognition for pronunciation practice
- Grammar lessons with exercises
- Daily goals with reminders
- Achievements and gamification
- Offline mode

### Advanced Features (P2)
- AI conversation practice
- Community features (forums, language exchange)
- Stories and reading practice
- Listening comprehension exercises
- Writing practice with AI feedback
- Leaderboards
- Premium subscription

---

## 2. Technology Stack Options

### Option A: Simple/Beginner-Friendly
Best for solo developers and rapid prototyping.

```
Frontend:     Next.js 14+ (App Router) with TypeScript
Styling:      Tailwind CSS + shadcn/ui
Backend:      Next.js API Routes (serverless)
Database:     Supabase (PostgreSQL + Auth + Storage)
Deployment:   Vercel
```

### Option B: Modern Full-Stack (Recommended)
Best for production apps and small teams.

```
Frontend:     React 18+ with TypeScript + Vite
State:        Zustand or TanStack Query
Styling:      Tailwind CSS + Radix UI
Backend:      Node.js + Express + TypeScript
API:          REST + WebSockets (or tRPC)
Database:     PostgreSQL + Redis
ORM:          Prisma
Auth:         Passport.js + JWT
Storage:      AWS S3 or Cloudflare R2
Deployment:   Docker + AWS/Railway
```

### Option C: Mobile-First
Best for consumer mobile apps.

```
Mobile:       React Native + Expo
Navigation:   React Navigation 6+
Backend:      Node.js + NestJS
API:          GraphQL with Apollo
Database:     PostgreSQL + Redis
Offline:      WatermelonDB or SQLite
Push:         Firebase Cloud Messaging
```

---

## 3. Data Model

### Core Entities

```
User
├── id, email, displayName, avatarUrl
├── nativeLanguage, xpTotal, level
├── streakDays, streakLastDate
└── isPremium, createdAt

Language
├── id, code (en, es, fr)
├── name, nativeName, flagEmoji
└── isActive

Course
├── id, sourceLanguage, targetLanguage
├── title, description
├── difficultyLevel, isPremium
└── units[]

Unit
├── id, courseId, title
├── description, orderIndex, icon
└── lessons[]

Lesson
├── id, unitId, title
├── type (vocabulary, grammar, listening, speaking, mixed)
├── xpReward, orderIndex
└── items[], quizzes[]

Vocabulary
├── id, courseId
├── word, translation, pronunciation
├── partOfSpeech, audioUrl, imageUrl
├── difficulty
└── examples[]

UserVocabulary (SRS Tracking)
├── userId, vocabularyId
├── easeFactor (default 2.5)
├── intervalDays (default 1)
├── repetitions, nextReviewAt
└── timesCorrect, timesIncorrect

Quiz
├── id, lessonId, title
├── passingScore, timeLimitSec
└── questions[]

QuizQuestion
├── id, quizId
├── type (multiple_choice, fill_blank, matching, listening)
├── prompt, correctAnswer, options[]
├── points, explanation
└── audioUrl, imageUrl

Achievement
├── id, name, description
├── iconUrl, xpReward
├── criteria, category
└── userAchievements[]

DailyGoal
├── userId, date
├── xpTarget, xpEarned
├── lessonsTarget, lessonsDone
└── completed
```

### SM-2 Spaced Repetition Algorithm

```typescript
function calculateNextReview(current: UserVocabulary, quality: 0-5) {
  let { easeFactor, intervalDays, repetitions } = current;

  if (quality < 3) {
    // Failed - reset
    repetitions = 0;
    intervalDays = 1;
  } else {
    // Passed - increase interval
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
  }

  // Update ease factor (min 1.3)
  easeFactor = Math.max(1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  return { easeFactor, intervalDays, repetitions, nextReviewAt };
}
```

---

## 4. Implementation Phases

### Phase 1: MVP (Weeks 1-4)

**Week 1: Project Setup & Auth**
- Initialize project with chosen stack
- Set up dev environment (Docker, ESLint, Prettier)
- Configure database and ORM
- Implement user authentication
- Create initial database migrations

**Week 2: Content Structure**
- Create Language, Course, Unit, Lesson models
- Build admin endpoints for content management
- Implement course/lesson listing APIs
- Create seed data for one language pair (EN→ES)

**Week 3: Learning Flow**
- Vocabulary card display component
- Basic lesson flow (sequential cards)
- Simple quiz implementation
- Progress saving
- XP calculation

**Week 4: Basic UI**
- Home dashboard with course progress
- Lesson selection screen
- Basic user profile
- Responsive design
- Error handling

### Phase 2: Core Features (Weeks 5-10)

**Weeks 5-6: Spaced Repetition**
- Implement SM-2 algorithm
- Review queue system
- Practice mode for due vocabulary
- Review statistics

**Weeks 7-8: Enhanced Quizzes**
- Additional question types
- Adaptive difficulty
- Mistake tracking
- Hearts system

**Weeks 9-10: Gamification**
- Streak tracking
- Daily goals
- Achievement system
- Push notifications

### Phase 3: Advanced Features (Weeks 11-16)

**Weeks 11-12: Audio & Speech**
- Text-to-speech integration
- Speech recognition
- Pronunciation scoring
- Listening exercises

**Weeks 13-14: Extended Content**
- Grammar lesson framework
- Stories/reading feature
- Additional languages

**Weeks 15-16: AI Integration**
- AI conversation practice
- Writing feedback
- Personalized recommendations

### Phase 4: Polish (Weeks 17-20)

**Weeks 17-18: Performance & Offline**
- Code splitting, image optimization
- Service worker, IndexedDB
- PWA features

**Week 19: Analytics & Admin**
- Analytics dashboard
- Admin CMS
- Error tracking

**Week 20: Launch**
- Security audit
- Load testing
- Documentation
- App store prep

---

## 5. Directory Structure (Full-Stack Option B)

```
lemming/
├── docker-compose.yml
├── .github/workflows/
│
├── packages/
│   ├── shared/                  # Shared types & utilities
│   │   └── src/
│   │       ├── types/
│   │       ├── constants/
│   │       └── utils/srs.ts     # SM-2 algorithm
│   │
│   ├── web/                     # React frontend
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ui/          # Button, Card, Input
│   │       │   ├── lesson/      # VocabCard, LessonProgress
│   │       │   └── quiz/        # MultipleChoice, FillBlank
│   │       ├── pages/           # Home, Dashboard, Lesson
│   │       ├── hooks/
│   │       ├── stores/          # Zustand
│   │       └── services/        # API client
│   │
│   └── api/                     # Node.js backend
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       └── src/
│           ├── routes/
│           ├── controllers/
│           ├── services/
│           ├── middleware/
│           └── utils/
│
├── content/                     # Learning content
│   └── courses/
│       └── en-es/
│           ├── course.json
│           └── units/
│
└── docs/
```

---

## 6. API Endpoints

### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

### Users
```
GET    /api/users/me
PATCH  /api/users/me
GET    /api/users/me/stats
GET    /api/users/me/achievements
```

### Courses & Lessons
```
GET    /api/languages
GET    /api/courses
GET    /api/courses/:id
POST   /api/courses/:id/enroll
GET    /api/courses/:id/units
GET    /api/units/:id/lessons
GET    /api/lessons/:id
POST   /api/lessons/:id/complete
```

### Vocabulary & Reviews
```
GET    /api/courses/:id/vocabulary
GET    /api/reviews/due
POST   /api/reviews/:vocabId
```

### Quizzes
```
GET    /api/lessons/:id/quiz
POST   /api/quizzes/:id/submit
```

### Progress
```
GET    /api/progress/daily
GET    /api/progress/streak
POST   /api/progress/goals
```

---

## 7. Key Implementation Files

1. **`/packages/api/prisma/schema.prisma`** - Database schema
2. **`/packages/shared/src/utils/srs.ts`** - Spaced repetition algorithm
3. **`/packages/api/src/services/lesson.service.ts`** - Lesson logic
4. **`/packages/web/src/pages/Lesson.tsx`** - Main lesson UI
5. **`/packages/api/src/routes/index.ts`** - API routes

---

## 8. Next Steps

1. **Choose a technology stack** (A, B, or C)
2. **Initialize the project** with the chosen stack
3. **Set up the database** and create schema
4. **Implement authentication** first
5. **Build the MVP** lesson flow
6. **Add sample content** for testing

---

## Questions to Consider

- What languages do you want to support initially?
- Web app, mobile app, or both?
- Do you want premium/subscription features?
- Will you create content yourself or use existing datasets?
- What's your primary target audience (casual learners, serious students)?
