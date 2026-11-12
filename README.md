# Pet Care Management System

Web application for managing pet care, built for the KH5041CMD *Internet and Web Technologies* coursework. Pet owners can register, log in, and manage their pets, vet/grooming appointments, medical records and care reminders. Admins can view all users and change user roles. The API is built with Node.js and Express, stores data in MySQL, hashes passwords with bcrypt and uses JWTs for login sessions (sent as an HttpOnly cookie or a Bearer header). The frontend is plain HTML, CSS and JavaScript in the `public` folder, served by the same Express server, with no frontend framework or library.

## Requirements

- Node.js 20.17 or newer
- npm
- MySQL 8 (or MariaDB, e.g. from XAMPP) running locally

## Running the project

```bash
npm install
cp .env.example .env        # on Windows: copy .env.example .env
```

Open `.env`, fill in your MySQL details (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) and set `JWT_SECRET` to a long random value, for example the output of:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then start the server:

```bash
npm start          # or: npm run dev  (restarts on file changes)
```

Open `http://localhost:3000` in a browser to use the app. For local testing over plain http set `COOKIE_SECURE=false` in `.env`. The API health check is at `/health`. On the first start the server creates the `petcare` database and all tables in MySQL by itself. The auth log (`logs/auth.log`) is also created automatically.

### Creating the first admin

Every new account is a normal user. To make an account an admin, sign up first and then run:

```bash
npm run make-admin -- someone@example.com
```

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

## Frontend pages

| Page | What it does |
| --- | --- |
| `index.html` | Landing page (opens the dashboard if you are already logged in) |
| `signup.html`, `login.html` | Sign up and log in, with the same validation rules as the backend |
| `dashboard.html` | Counts, upcoming appointments and open/overdue reminders |
| `pets.html` | Add, edit and delete pets |
| `pet.html?id=…` | Medical records and reminders for one pet |
| `appointments.html` | Book, edit, complete and delete appointments |
| `admin.html` | Admins only: list users and change roles |

Every page loads `js/api.js`, which sends requests with `fetch`, adds the `X-CSRF-Token` header to POST/PUT/DELETE requests and sends the user to the login page when the session has expired. The login token stays in the HttpOnly cookie and is never stored by JavaScript. All user data is put on the page with `textContent`, never `innerHTML`, so typed HTML is shown as text. The light/dark theme choice is saved in a non-sensitive `theme` cookie.

## Third-party packages

| Package | Purpose |
| --- | --- |
| express | Web server and routing |
| mysql2 | MySQL database driver (used with async/await) |
| bcryptjs | Password hashing |
| jsonwebtoken | Creating and checking login tokens (JWT) |
| cors | Controls which frontend origin may call the API |
| dotenv | Loads settings from the `.env` file |

The frontend uses no third-party plugins or UI libraries.

## Project structure

```
controllers/   request handling and business logic for each feature
routes/        maps URLs to controller functions
middleware/    login check (JWT + CSRF) and admin check
database/      MySQL connection pool, query helpers and table creation
utils/         input validation and authentication event logging
scripts/       make-admin helper
public/        frontend: HTML pages, css/style.css and js/ (one script per page + api.js)
```

## Security tools and testing

Security testing so far: manual testing of authentication, ownership checks, input validation, CSRF and SQL injection attempts with Postman and the browser, plus `npm audit` for dependency vulnerabilities. Penetration testing for the final submission is still to be done.
