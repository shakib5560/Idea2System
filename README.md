# Idea2System

**Idea2System** is an AI-powered software planning platform that turns a business idea into a practical technical blueprint for building a product.

It is designed for startups, agencies, and freelance developers who need a reliable path from a rough concept to an implementation-ready plan:

```text
Idea → Requirements → Database Design → System Architecture → API Design → Development Plan
```

Instead of moving between separate AI tools for product discovery, system design, and project planning, Idea2System brings the workflow together in one place.

## The problem

Turning an idea into a buildable product usually requires several time-consuming steps: clarifying requirements, identifying users and features, designing data models, choosing an architecture, defining APIs, and breaking work into deliverable tasks. Important decisions can be missed or become inconsistent when these steps are handled independently.

Idea2System helps teams create a connected, reviewable foundation before development begins.

## What the platform will generate

Given a product idea and relevant context, Idea2System is intended to produce:

- **Product requirements** — problem statement, target users, user stories, functional requirements, and non-functional requirements.
- **Database design** — entities, relationships, fields, constraints, and suggested schema structure.
- **System architecture** — recommended components, services, integrations, data flow, and technology considerations.
- **API design** — endpoint groups, request/response contracts, authentication requirements, and error-handling guidance.
- **Development plan** — prioritized milestones, implementation tasks, dependencies, and an MVP-first delivery path.

The goal is not to replace engineering judgment; it is to give teams a strong, editable starting point that can be validated and expanded together.

## Current status

The project is in active development. The current repository contains the **Core API**, including:

- NestJS API foundation with API versioning
- PostgreSQL persistence through Prisma
- Email/password registration and login
- JWT-based sessions with signed HTTP-only cookies
- Google OAuth 2.0 / OpenID Connect login with PKCE
- GitHub OAuth login with PKCE
- Encrypted storage of provider tokens
- Request validation, CORS, Helmet, compression, rate limiting, and Swagger documentation

The AI-generated planning modules and client application are planned next.

## Tech stack

| Area | Technology |
| --- | --- |
| API | NestJS, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | Passport, JWT, Google OAuth, GitHub OAuth |
| API documentation | Swagger / OpenAPI |
| Package manager | pnpm |

## Repository structure

```text
.
├── core-api/              # NestJS backend application
│   ├── prisma/            # Prisma schema and migrations
│   ├── src/auth/          # Local and OAuth authentication
│   ├── src/common/        # Shared services, including token encryption
│   └── src/prisma/        # Prisma module and service
└── README.md
```

## Getting started

### Prerequisites

- Node.js 20 or later
- pnpm 9 or later
- PostgreSQL

### 1. Install dependencies

```bash
cd core-api
pnpm install
```

### 2. Configure environment variables

Create `core-api/.env` and add the following values. Do not commit this file.

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
# Public address of this API. It is used in links sent by verification emails.
API_URL=http://localhost:5000

DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/idea2system?schema=public

JWT_SECRET=replace-with-a-long-random-secret
COOKIE_SECRET=replace-with-a-long-random-secret
# Exactly 64 hexadecimal characters (32 bytes)
TOKEN_ENCRYPTION_KEY=replace-with-a-64-character-hex-key

# Transactional email (Resend). In development, omitting RESEND_API_KEY logs
# the verification link instead of sending it.
RESEND_API_KEY=re_your-resend-api-key
EMAIL_FROM=Idea2System <onboarding@your-verified-domain.com>

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/v1.0/auth/github/callback

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1.0/auth/google/callback
```

For local development, register these OAuth redirect URLs with the providers:

- Google: `http://localhost:5000/api/v1.0/auth/google/callback`
- GitHub: `http://localhost:5000/api/v1.0/auth/github/callback`

### 3. Apply database migrations

```bash
pnpm prisma migrate dev
```

### 4. Start the API

```bash
pnpm start:dev
```

The API runs at `http://localhost:5000/api/v1.0`.

In development, Swagger documentation is available at:

```text
http://localhost:5000/api/v1.0/docs
```

## Authentication endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1.0/auth/register` | Create an account with email and password |
| `GET` | `/api/v1.0/auth/verify-email?token=...` | Verify a newly registered email address |
| `POST` | `/api/v1.0/auth/resend-verification` | Request a new verification link (`{ "email": "..." }`) |
| `POST` | `/api/v1.0/auth/login` | Sign in with email and password |
| `GET` | `/api/v1.0/auth/google` | Start Google sign-in |
| `GET` | `/api/v1.0/auth/github` | Start GitHub sign-in |
| `GET` | `/api/v1.0/auth/me` | Get the authenticated user profile |
| `POST` | `/api/v1.0/auth/logout` | End the application session |

See the [Core API README](core-api/README.md) for the complete OAuth configuration and endpoint list.

## Useful commands

Run these from `core-api/`:

```bash
pnpm start:dev       # Start the API with watch mode
pnpm build           # Build for production
pnpm test            # Run unit tests
pnpm test:e2e        # Run end-to-end tests
pnpm lint            # Lint and apply configured fixes
pnpm prisma studio   # Open Prisma Studio
```

## Roadmap

- [x] Core API and user authentication
- [x] Google and GitHub OAuth
- [ ] Idea intake and project workspace
- [ ] AI-assisted requirements generation
- [ ] Database schema and ERD generation
- [ ] Architecture and technology recommendations
- [ ] API contract generation
- [ ] Milestone and task planning
- [ ] Exportable technical blueprints
- [ ] Collaborative review and version history

## Contributing

Create a feature branch from the latest `main` branch, make focused changes, run the relevant checks, then open a pull request back into `main`.

```bash
git switch main
git pull origin main
git switch -c feature/short-description
```

## License

This project is currently private and unlicensed. Add a license before distributing or accepting external contributions.
