# Postman Authentication Testing Guide

This guide describes how to test the private-by-default NestJS authentication layer in **Postman**.

---

## 1. Global Setup

1. Open **Postman**.
2. Create a new **Collection** named `Idea2System API`.
3. In the collection settings, go to the **Variables** tab and add:
   - **Name:** `baseUrl`
   - **Value:** `http://localhost:5000/api/v1.0`
4. Go to the **Authorization** tab of the Collection:
   - **Type:** `Bearer Token`
   - **Token:** `{{jwt_token}}`
   - _This ensures all requests in the collection inherit JWT authentication by default._

---

## 2. Public Endpoints (No Token Required)

These routes are decorated with `@Public()` and do not require any Authorization header.

### A. Root

- **Method:** `GET`
- **URL:** `{{baseUrl}}/`
- **Expected Response:** `200 OK` with string `Hello World!`

### A2. Health Check

- **Method:** `GET`
- **URL:** `{{baseUrl}}/health`
- **Expected Response:** `200 OK` reporting API and Redis health:
  ```json
  {
    "status": "ok",
    "redis": "up"
  }
  ```

### B. Register User

- **Method:** `POST`
- **URL:** `{{baseUrl}}/auth/register`
- **Body (JSON):**
  ```json
  {
    "email": "user@example.com",
    "username": "testuser",
    "password": "securePassword123"
  }
  ```
- **Expected Response:** `201 Created` returning the JWT token and user info:
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "username": "testuser"
    }
  }
  ```

### C. Login User (credential validation)

- **Method:** `POST`
- **URL:** `{{baseUrl}}/auth/login`
- **Body (JSON):**
  ```json
  {
    "identifier": "testuser",
    "password": "securePassword123"
  }
  ```
- **Postman Test Script (Automatic Token Capture):**
  Go to the **Tests** tab of the Login request and add the following snippet:
  ```javascript
  const response = pm.response.json();
  if (response && response.accessToken) {
    pm.collectionVariables.set('jwt_token', response.accessToken);
    console.log('JWT Access Token saved successfully!');
  }
  ```
- **Expected Response:** `200 OK` + returns `accessToken`. Additionally sets a secure, signed `__session` HTTP-only cookie.

---

## 3. Protected Endpoints (Token Required)

By default, these routes require JWT authentication.

### A. Get Current User Profile (`/auth/me`)

- **Method:** `GET`
- **URL:** `{{baseUrl}}/auth/me`
- **Authentication Inherited:** Yes (`Inherit auth from parent`).
- **Testing without Token:** Set Authorization to `No Auth`.
  - **Expected Response:** `401 Unauthorized`
- **Testing with Token:** Use Inherited Auth or manually set Bearer `{{jwt_token}}`.
  - **Expected Response:** `200 OK` containing:
    ```json
    {
      "id": "uuid-here",
      "email": "user@example.com",
      "username": "testuser"
    }
    ```

### B. Logout User

- **Method:** `POST`
- **URL:** `{{baseUrl}}/auth/logout`
- **Expected Response:** `200 OK` clearing the `__session` cookie and invalidating the token via Redis blacklist.
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```
- **Verification Step**: After invoking Logout, immediately try calling `GET {{baseUrl}}/auth/me` with the same token in the Bearer header.
  - **Expected Response:** `401 Unauthorized` (Token has been blacklisted).

### C. Logout Everywhere (Invalidate All Sessions)

- **Method:** `POST`
- **URL:** `{{baseUrl}}/auth/logout-everywhere`
- **Authentication Inherited:** Yes (`Inherit auth from parent`).
- **Expected Response:** `200 OK` clearing the `__session` cookie and invalidating all tokens issued for this user prior to this timestamp.
  ```json
  {
    "success": true,
    "message": "Logged out from all devices successfully"
  }
  ```
- **Verification Step**: After invoking logout-everywhere, try using any token previously issued for this user on any protected endpoint.
  - **Expected Response:** `401 Unauthorized` (User has been logged out from all devices).

---

---

## 5. Testing Redis Functionality in Postman

Redis powers health checks, profile caching, and JWT blacklist/revocation in the application. Follow these 4 Postman test cases to verify Redis is working:

### Test Case 1: Health Check Endpoint
- **Method:** `GET`
- **URL:** `{{baseUrl}}/health`
- **Expected Result (Redis UP):** `200 OK`
  ```json
  {
    "status": "ok",
    "redis": "up"
  }
  ```
- **Expected Result (Redis DOWN):** `200 OK` (with status error)
  ```json
  {
    "status": "error",
    "redis": "down",
    "error": "..."
  }
  ```

### Test Case 2: Redis Profile Caching (`GET /auth/me`)
1. Log in via `POST {{baseUrl}}/auth/login` to obtain a fresh `accessToken`.
2. Send `GET {{baseUrl}}/auth/me` with Bearer `{{jwt_token}}`.
   - **First Request:** Fetches user profile from PostgreSQL DB and caches it in Redis under key `cache:...`.
   - **Subsequent Requests (within 5 mins):** Served directly from Redis cache with sub-millisecond response time.

### Test Case 3: Redis Single Token Revocation Blacklist (`POST /auth/logout`)
1. Log in via `POST {{baseUrl}}/auth/login`. Copy the returned `accessToken`.
2. Send `GET {{baseUrl}}/auth/me` with the `accessToken` -> returns `200 OK`.
3. Send `POST {{baseUrl}}/auth/logout` using the same `accessToken` in Bearer Auth.
   - **Redis Action:** Pushes token's unique `jti` to Redis blacklist key `bl:<jti>` with TTL equal to the token's remaining lifetime.
4. Immediately re-send `GET {{baseUrl}}/auth/me` using that same `accessToken`.
   - **Expected Result:** `401 Unauthorized` (Redis blacklist check blocks the revoked token).

### Test Case 4: Redis User-Wide Revocation (`POST /auth/logout-everywhere`)
1. Log in via `POST {{baseUrl}}/auth/login` and save Token A.
2. Log in again (or from another device) and save Token B.
3. Send `POST {{baseUrl}}/auth/logout-everywhere` using Token A.
   - **Redis Action:** Stores revocation timestamp under `bl:user:<userId>`.
4. Try sending `GET {{baseUrl}}/auth/me` using Token B.
   - **Expected Result:** `401 Unauthorized` (All tokens issued before the logout timestamp are invalidated).

