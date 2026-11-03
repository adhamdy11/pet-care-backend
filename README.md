# Pet Care Management System – Backend

Backend API for the Pet Care Management System, built for the KH5041CMD *Internet and Web Technologies* coursework. Pet owners can register, log in, and manage their pets, vet/grooming appointments, medical records and care reminders. Admins can view all users and change user roles. The API is built with Node.js and Express, stores data in SQLite, hashes passwords with bcrypt and uses JWTs for login sessions (sent as an HttpOnly cookie or a Bearer header). The frontend has not been built yet.

## Requirements

- Node.js 20.17 or newer
- npm

## Running the project

```bash
npm install
cp .env.example .env        # on Windows: copy .env.example .env
```

Open `.env` and set `JWT_SECRET` to a long random value, for example the output of:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then start the server:

```bash
npm start          # or: npm run dev  (restarts on file changes)
```

The API runs on `http://localhost:3000`. The SQLite database (`database/petcare.sqlite`) and the auth log (`logs/auth.log`) are created automatically.

### Creating the first admin

Every new account is a normal user. To make an account an admin, sign up first and then run:

```bash
npm run make-admin -- someone@example.com
```

### Running the tests

```bash
npm test
```

The tests start the server on port 3999 with a temporary database, so they do not touch your real data.

## API overview

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | /auth/signup | – | Register (username, email, password) |
| POST | /auth/login | – | Log in; sets cookies and returns token + csrfToken |
| POST | /auth/logout | – | Clears the login cookies |
| GET | /auth/me | user | Current user's profile |
| GET | /admin/all-users | admin | List all users |
| PUT | /admin/update-role/:id | admin | Change a user's role (`user` / `admin`) |
| POST, GET | /pets | user | Create / list your pets |
| PUT, DELETE | /pets/:id | user | Update / delete your pet |
| POST, GET | /appointments | user | Create / list your appointments |
| PUT, DELETE | /appointments/:id | user | Update / delete an appointment |
| POST | /records | user | Add a medical record |
| GET | /records/pet/:petId | user | Medical records for one pet |
| PUT, DELETE | /records/:id | user | Update / delete a medical record |
| POST | /reminders | user | Create a reminder |
| GET | /reminders/pet/:petId | user | Reminders for one pet |
| PUT, DELETE | /reminders/:id | user | Update (e.g. `is_done`) / delete a reminder |

Dates use the format `YYYY-MM-DD`. Passwords must be 8–72 characters with at least one letter and one number.

**Authentication:** Postman and other API clients can send `Authorization: Bearer <token>`. A browser uses the HttpOnly `token` cookie instead; for POST/PUT/DELETE requests it must also send the `X-CSRF-Token` header with the value of the `csrfToken` cookie.

## Third-party packages

| Package | Purpose |
| --- | --- |
| express | Web server and routing |
| sqlite3 | SQLite database driver |
| bcryptjs | Password hashing |
| jsonwebtoken | Creating and checking login tokens (JWT) |
| cors | Controls which frontend origin may call the API |
| dotenv | Loads settings from the `.env` file |

Tests use Node's built-in test runner (`node:test`), so no testing package is needed.

## Project structure

```
controllers/   request handling and business logic for each feature
routes/        maps URLs to controller functions
middleware/    login check, admin check, security headers, login rate limit
database/      SQLite connection, Promise helpers and table creation
utils/         input validation and authentication event logging
scripts/       make-admin helper
tests/         automated API tests
```

## Security tools and testing

Security testing so far: automated API tests (`npm test`) covering authentication, ownership checks, input validation, CSRF, rate limiting and SQL injection attempts, plus `npm audit` for dependency vulnerabilities. Penetration testing for the final submission is still to be done. See `BACKEND_REVIEW_REPORT.md` for the full review.
