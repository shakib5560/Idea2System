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

## 4. Testing Cookie-Based Authentication

Because the API accepts both Bearer Header and the signed `__session` cookie:

1. Log in via `POST {{baseUrl}}/auth/login`.
2. Observe the **Cookies** tab in Postman. You will see the `__session` cookie stored for your domain.
3. In a request (like `GET {{baseUrl}}/auth/me`), set the **Authorization** to `No Auth`.
4. Send the request. Postman will automatically attach the stored cookie, and the API will authorize the request with `200 OK`.
