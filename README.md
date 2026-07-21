# Idea2System Core API

## OAuth 2.0 / OpenID Connect Setup

This project supports secure social login via **Google** and **GitHub** using **Authorization Code Flow with PKCE**, encrypted token storage (AES-256-GCM), and server-side token refresh.

### 1. Required Environment Variables

Add the following environment variables to your `.env` file:

```env
# Server & Client
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Auth & Encryption Secrets
JWT_SECRET=your-jwt-secret-key
COOKIE_SECRET=your-cookie-signing-secret
TOKEN_ENCRYPTION_KEY=32-byte-hex-encryption-key-for-tokens # 64 hex chars

# GitHub OAuth Credentials
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/v1.0/auth/github/callback

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1.0/auth/google/callback
```

---

### 2. Provider Redirect URLs Configuration

#### Google Cloud Console Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/) -> APIs & Services -> Credentials.
2. Select your OAuth 2.0 Client ID.
3. Under **Authorized redirect URIs**, add:
   - Development: `http://localhost:5000/api/v1.0/auth/google/callback`
   - Production: `https://your-domain.com/api/v1.0/auth/google/callback` (or your client callback URI `https://idea2system.vercel.app/auth/google/callback`)
4. Ensure scopes `openid`, `email`, and `profile` are enabled.

#### GitHub OAuth App Configuration
1. Go to [GitHub Developer Settings](https://github.com/settings/developers) -> OAuth Apps.
2. Select your registered app.
3. Set **Authorization callback URL** to:
   - Development: `http://localhost:5000/api/v1.0/auth/github/callback`
   - Production: `https://your-domain.com/api/v1.0/auth/github/callback` (or `https://idea2system.vercel.app/auth/github/callback`)

---

### 3. API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1.0/auth/google` | Initiates Google OAuth 2.0 / OIDC login flow with PKCE |
| `GET` | `/api/v1.0/auth/google/callback` | Callback endpoint for Google OAuth authorization code |
| `GET` | `/api/v1.0/auth/github` | Initiates GitHub OAuth 2.0 login flow with PKCE |
| `GET` | `/api/v1.0/auth/github/callback` | Callback endpoint for GitHub OAuth authorization code |
| `POST` | `/api/v1.0/auth/refresh-provider-token/:provider` | Server-side refresh of stored provider access token |
| `DELETE` | `/api/v1.0/auth/oauth/:provider` | Revokes stored tokens for provider |
| `POST` | `/api/v1.0/auth/logout` | Clears app session cookie |
| `GET` | `/api/v1.0/auth/me` | Returns authenticated user profile |

---

### 4. Running Tests

```bash
# Unit tests (including OAuth & Token Encryption tests)
pnpm run test
```
