<div align="center">

# 🧩 Idea2System API

### From a rough idea to an implementation-ready technical blueprint.

**Idea → Requirements → Database Design → System Architecture → API Design → Development Plan**

<p>
  <img alt="Status" src="https://img.shields.io/badge/status-active--development-6C63FF?style=for-the-badge">
  <img alt="License" src="https://img.shields.io/badge/license-private--unlicensed-lightgrey?style=for-the-badge">
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A520-339933?style=for-the-badge&logo=node.js&logoColor=white">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-%E2%89%A59-F69220?style=for-the-badge&logo=pnpm&logoColor=white">
</p>

<p>
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white">
  <img alt="Swagger" src="https://img.shields.io/badge/Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black">
</p>

</div>

<br>

## 📖 Overview

Turning an idea into a buildable product usually means bouncing between separate tools for product discovery, system design, and project planning — clarifying requirements, identifying users and features, designing data models, choosing an architecture, defining APIs, and breaking work into deliverable tasks.

When these steps are handled in isolation, decisions get missed, inconsistent, or lost.

**Idea2System** brings the entire workflow into one place, generating a connected, reviewable foundation *before* a single line of production code is written — an editable starting point your team can validate and expand together, not a replacement for engineering judgment.

<br>

## 🚀 What It Generates

<table>
<tr>
<td width="20%" align="center"><b>📋<br>Requirements</b></td>
<td>Problem statement, target users, user stories, functional & non-functional requirements.</td>
</tr>
<tr>
<td align="center"><b>🗄️<br>Database Design</b></td>
<td>Entities, relationships, fields, constraints, and a suggested schema structure.</td>
</tr>
<tr>
<td align="center"><b>🏗️<br>System Architecture</b></td>
<td>Recommended components, services, integrations, data flow, and technology considerations.</td>
</tr>
<tr>
<td align="center"><b>🔌<br>API Design</b></td>
<td>Endpoint groups, request/response contracts, authentication requirements, and error-handling guidance.</td>
</tr>
<tr>
<td align="center"><b>🗺️<br>Development Plan</b></td>
<td>Prioritized milestones, implementation tasks, dependencies, and an MVP-first delivery path.</td>
</tr>
</table>

<br>

## ✅ Current Status

The repository currently ships the **Core API** — the authenticated foundation the AI planning modules will build on top of:

- ⚙️ NestJS API foundation with API versioning
- 🐘 PostgreSQL persistence through Prisma
- 🔐 Email/password registration and login
- 🍪 JWT-based sessions with signed, HTTP-only cookies
- 🔑 Google OAuth 2.0 / OpenID Connect login with PKCE
- 🔑 GitHub OAuth login with PKCE
- 🔒 Encrypted storage of provider tokens
- 🛡️ Request validation, CORS, Helmet, compression, rate limiting
- 📚 Swagger / OpenAPI documentation

> The AI-generated planning modules and client application are next on the roadmap.

<br>

## 🛠️ Tech Stack

| Area | Technology |
|---|---|
| **API** | NestJS, TypeScript |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Authentication** | Passport, JWT, Google OAuth, GitHub OAuuth |
| **API Documentation** | Swagger / OpenAPI |
| **Package Manager** | pnpm |

<br>

## 📁 Repository Structure

```
.
├── core-api/              # NestJS backend application
│   ├── prisma/            # Prisma schema and migrations
│   ├── src/auth/          # Local and OAuth authentication
│   ├── src/common/        # Shared services, including token encryption
│   └── src/prisma/        # Prisma module and service
└── README.md
```

<br>

## ⚡ Getting Started

### Prerequisites

- Node.js `20+`
- pnpm `9+`
- PostgreSQL

### 1️⃣ Install dependencies

```bash
cd core-api
pnpm install
```

### 2️⃣ Configure environment variables

Create `core-api/.env` — **do not commit this file.**

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
# Public address of this API. Used in links sent by verification emails.
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

For local development, register these redirect URLs with each provider:

| Provider | Redirect URL |
|---|---|
| Google | `http://localhost:5000/api/v1.0/auth/google/callback` |
| GitHub | `http://localhost:5000/api/v1.0/auth/github/callback` |

### 3️⃣ Apply database migrations

```bash
pnpm prisma migrate dev
```

### 4️⃣ Start the API

```bash
pnpm start:dev
```

The API runs at **`http://localhost:5000/api/v1.0`**.
In development, Swagger docs are available at **`http://localhost:5000/api/v1.0/docs`**.

<br>

## 🔐 Authentication Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1.0/auth/register` | Create an account with email and password |
| `GET` | `/api/v1.0/auth/verify-email?token=...` | Verify a newly registered email address |
| `POST` | `/api/v1.0/auth/resend-verification` | Request a new verification link (`{ "email": "..." }`) |
| `POST` | `/api/v1.0/auth/login` | Sign in with email and password |
| `GET` | `/api/v1.0/auth/google` | Start Google sign-in |
| `GET` | `/api/v1.0/auth/github` | Start GitHub sign-in |
| `GET` | `/api/v1.0/auth/me` | Get the authenticated user profile |
| `POST` | `/api/v1.0/auth/logout` | End the application session |

> 📄 See the [Core API README](core-api/README.md) for the complete OAuth configuration and endpoint list.

<br>

## 🧰 Useful Commands

*Run these from `core-api/`:*

| Command | Description |
|---|---|
| `pnpm start:dev` | Start the API with watch mode |
| `pnpm build` | Build for production |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run end-to-end tests |
| `pnpm lint` | Lint and apply configured fixes |
| `pnpm prisma studio` | Open Prisma Studio |

<br>

## 🗺️ Roadmap

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

<br>

## 🤝 Contributing

Create a feature branch from the latest `main`, make focused changes, run the relevant checks, then open a pull request back into `main`.

```bash
git switch main
git pull origin main
git switch -c feature/short-description
```

<br>

## 📄 License

This project is currently **private and unlicensed**. Add a license before distributing or accepting external contributions.

<br>

<div align="center">

**Built for founders, agencies, and freelancers who'd rather start building than start guessing.**

</div>