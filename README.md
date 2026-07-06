# MathsStreak

A daily math quiz app. One AI-generated question a day, answer it, build your streak.

## Tech Stack

- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (Prisma ORM)
- **Auth:** JWT, bcrypt
- **AI:** Groq API (Llama 3.3 70B) for daily question generation

## Features

- User registration and login with JWT authentication
- One AI-generated math question per day, shared across all users
- Answer submission with correctness checking
- Streak tracking for consecutive correct days
- Prevents duplicate submissions for the same day

## Getting Started

### Prerequisites

- Node.js installed
- A PostgreSQL database (e.g. via Prisma Postgres)
- A free Groq API key (console.groq.com)

### Setup

1. Clone the repo and install dependencies:

\`\`\`bash
git clone <your-repo-url>
cd quizstreak-backend
npm install
\`\`\`

2. Create a \`.env\` file in the root with:

\`\`\`
DATABASE_URL="your-postgres-connection-string"
JWT_SECRET="your-random-secret-string"
GROQ_API_KEY="your-groq-api-key"
PORT=3000
\`\`\`

3. Run database migrations:

\`\`\`bash
npx prisma migrate dev
\`\`\`

4. Start the dev server:

\`\`\`bash
npm run dev
\`\`\`

Server runs at \`http://localhost:3000\`.

## API Endpoints

### Auth

**POST \`/auth/register\`**
Register a new user.

\`\`\`json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
\`\`\`

Returns a JWT token and user object.

**POST \`/auth/login\`**
Log in an existing user.

\`\`\`json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
\`\`\`

Returns a JWT token and user object.

### Quiz

All quiz routes require an \`Authorization: Bearer <token>\` header.

**GET \`/quiz/today\`**
Get today's question. If the user has already answered, returns their result and current streak instead. If no question exists yet for today, one is generated on demand via Groq.

**POST \`/quiz/submit\`**
Submit an answer to today's question.

\`\`\`json
{
  "answer": "your answer"
}
\`\`\`

Returns whether the answer was correct, the correct answer, and the user's updated streak. Returns a 409 error if the user has already answered today.

## Known Issues / Notes

- Currently using Prisma 6 (not 7) due to driver adapter and ESM/CJS interop bugs encountered with Prisma 7's \`prisma-client\` generator on Windows.
- Dates are normalized to UTC throughout to match Postgres's \`@db.Date\` storage and avoid timezone-related streak calculation bugs.

## Roadmap

- [ ] Frontend (React + TypeScript + Tailwind)
- [ ] Deploy backend (Render) and frontend (Vercel)
- [ ] Add streak history / stats view
