# FOLIO — Research Paper & Literature Manager

A full-stack MERN web app for students and researchers to keep every paper they read in one place: the reference details, the PDF, reading status, notes and ready-to-use citations, grouped into projects with an exportable reference list.

## Features

| Area | What you can do |
| --- | --- |
| **Accounts** | Register, log in, log out, edit profile, change password. Passwords hashed with bcrypt; session in an HTTP-only JWT cookie. |
| **Library** | Add, edit and delete papers. Search by title, author, journal, tag or DOI. Filter by status, project, priority and PDF; sort six ways. Export the whole library to CSV. |
| **DOI lookup** | Paste a DOI and the form fills title, authors, year, journal, volume, issue, pages and abstract from Crossref. Warns if the DOI is already in your library. |
| **PDFs** | Attach a PDF (max 4 MB) when adding a paper or later. Preview inline, open, download, replace or remove. Stored in MongoDB GridFS. |
| **Reading status** | To Read → Reading → Read → Cited, or Dropped. Changes save instantly. "Read by" target dates show as due or overdue. |
| **Notes** | Typed notes (summary, key finding, method, quote, question, critique, idea) with page numbers, on each paper and in one searchable Notes page. |
| **Citations** | APA 7 and BibTeX generated for every paper, with a copy button and a stable cite key. |
| **Projects** | Group papers by the work they are for. Progress bar, deadline countdown, add papers from the library, and export the project's references as `.bib` or an APA list (all papers or only those marked Cited). |
| **Dashboard** | Totals, reading pipeline by status, reading queue (overdue and due in 7 days), project deadlines in the next 30 days, papers finished per month, top topics, latest notes. All computed from the database. |

### Rules that keep records consistent

- Adding the first note to a **To Read** paper moves it to **Reading**.
- A paper can only be marked **Cited** when it belongs to at least one project. If its last project is deleted or unlinked, it goes back to **Read**.
- Reaching Read or Cited stamps a **finished date**, which feeds the monthly chart. Moving back to To Read or Reading clears it.
- Deleting a paper deletes its notes and its PDF from storage.
- Deleting a project keeps its papers and only unlinks them.
- Replacing a PDF deletes the old file, so storage never fills with orphans.

## Tech stack

- **Frontend:** React 19, Vite, React Router 7, React Hook Form + Zod, Axios, Bootstrap 5 grid, custom CSS, Lucide icons, self-hosted IBM Plex Sans and Source Serif 4.
- **Backend:** Node.js 20+, Express 5, Mongoose 8, Multer, Zod, bcryptjs, jsonwebtoken, cookie-parser, Helmet.
- **Database:** MongoDB Atlas, with PDFs in GridFS.
- **Hosting:** Vercel (static frontend + one serverless function for the API).

## Project structure

```
folio/
├── api/index.js               Vercel serverless entry (exports the Express app)
├── server/
│   ├── .env.example
│   └── src/
│       ├── app.js             Express app: security headers, JSON, cookies, routes, errors
│       ├── server.js          Local dev entry (app.listen)
│       ├── seed.js            Demo account with real papers, notes and PDFs
│       ├── config/            env + cached MongoDB connection
│       ├── models/            User, Paper, Project, Note (+ shared enums)
│       ├── validators/        Zod schemas for every form and query
│       ├── middleware/        auth (JWT cookie), validate, upload (Multer), errors
│       ├── controllers/       auth, papers, notes, projects, dashboard
│       ├── routes/index.js    All REST routes
│       └── utils/             GridFS, APA/BibTeX formatting, Crossref lookup
├── client/
│   └── src/
│       ├── pages/             Login, Register, Dashboard, Library, Paper, Projects, Project, Notes, Settings, 404
│       ├── components/        Layout, forms (paper/project/note), modal, reference entry, file drop
│       ├── context/           Auth and toast providers
│       ├── hooks/useApi.js    Data loading + debounced search
│       ├── lib/               API client, Zod schemas, constants, formatting
│       └── styles/app.css     Design tokens and all styles
├── vercel.json
└── package.json               Root scripts + server dependencies
```

## Data model

| Collection | Main fields | Relationships |
| --- | --- | --- |
| `users` | name, email (unique), passwordHash, institution, timestamps | Owns everything below |
| `papers` | title, authors[], year, venue, paperType, volume, issue, pages, doi, url, abstract, tags[], status, priority, rating, readBy, finishedAt, file {fileId, key, originalName, size} | `userId` → users; `projectIds[]` → projects (many-to-many) |
| `projects` | title, description, type, status, deadline | `userId` → users |
| `notes` | kind, content, page | `userId` → users; `paperId` → papers |
| `papers.files` / `papers.chunks` | GridFS storage for PDFs, stored under random keys | Referenced from `papers.file.fileId` |

Every query is filtered by the logged-in user's id, so users only ever see their own records.

## Validation

Each form is validated twice: in the browser (React Hook Form + Zod) and on the server (Zod) before anything is saved. Server errors come back as `{ field: message }` and appear under the matching input.

| Form | Rules |
| --- | --- |
| Register | Name 2–60 chars, valid email, password 8–72 chars, passwords match, email not already used |
| Login | Valid email, password required; the same message for wrong email or password |
| Paper | Title 2–300 chars, at least one author, year 1800 to next year, valid DOI format, URL must start with http(s)://, status/priority/type from fixed lists, Cited requires a project, projects must be your own |
| PDF | PDF only, 4 MB max, and the server checks the file really starts with `%PDF-` |
| Project | Title 2–150 chars, type and status from fixed lists, valid date |
| Note | Paper must be yours, type from a fixed list, content 1–5000 chars, page 1–10000 |
| Profile / password | Email unique; current password must be correct; new password must differ |

## REST API

All routes are under `/api` and return `{ success, message, data }` (errors add `errors` for form fields). Everything except register, login, logout and health needs the login cookie.

| Resource | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/me`, `PUT /auth/password` |
| Papers | `GET /papers` (q, status, projectId, priority, tag, hasPdf, sort), `POST /papers` (multipart, optional PDF), `GET /papers/:id` (with notes + citations), `PUT /papers/:id`, `PATCH /papers/:id/status`, `DELETE /papers/:id` |
| PDF | `GET /papers/:id/file` (`?download=1` for attachment), `PUT /papers/:id/file`, `DELETE /papers/:id/file` |
| Library tools | `GET /papers/lookup?doi=`, `GET /papers/tags`, `GET /papers/export.csv` |
| Notes | `GET /notes` (q, kind, paperId), `POST /notes`, `PUT /notes/:id`, `DELETE /notes/:id` |
| Projects | `GET /projects`, `POST /projects`, `GET /projects/:id`, `PUT /projects/:id`, `DELETE /projects/:id`, `POST /projects/:id/papers`, `DELETE /projects/:id/papers/:paperId`, `GET /projects/:id/bibliography?format=bibtex\|apa&cited=1` |
| Dashboard | `GET /dashboard/stats` |
| Health | `GET /health` |

## Run it locally

You need Node.js 20 or newer and a MongoDB connection string (a free Atlas M0 cluster works; see below).

```bash
npm run install:all                  # installs server and client dependencies
cp server/.env.example server/.env   # then fill in MONGODB_URI and JWT_SECRET
npm run seed                         # optional: demo account with sample papers
npm run dev                          # API on :5000, site on http://localhost:5173
```

Demo login after seeding: **demo@folio.test / demo1234** (the login page has a button that fills it in).

### MongoDB Atlas setup

1. Create a free M0 cluster at cloud.mongodb.com.
2. **Database Access:** add a user with a password.
3. **Network Access:** add your IP for local work, and `0.0.0.0/0` for Vercel (its serverless IPs are not fixed).
4. **Connect → Drivers:** copy the connection string, put your password in it, and add a database name before the `?`, e.g. `...mongodb.net/folio?retryWrites=true&w=majority`.

## Deploy to Vercel

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project** and import the repository. Leave the root directory as the repository root; `vercel.json` sets the install, build and output settings.
3. Add environment variables: `MONGODB_URI`, `JWT_SECRET` (a long random string) and `NODE_ENV=production`.
4. Deploy. Run `npm run seed` locally with the same `MONGODB_URI` if you want the demo account online.

The site and API share one domain, so the HTTP-only cookie is sent automatically and no CORS setup is needed in production.

## Security notes

- bcrypt (12 rounds) for passwords; only the hash is stored.
- JWT in an `HttpOnly`, `Secure` (in production), `SameSite=Lax` cookie; nothing sensitive in browser storage.
- Every protected route checks the cookie and scopes every query by user id; ids from another account return 404.
- Search text is regex-escaped; CSV export neutralises spreadsheet formulas.
- Uploaded files get random storage keys, are checked for a real PDF signature, and are only streamed to their owner.
- Helmet sets security headers; secrets live in environment variables and `.env` is git-ignored.

## Limitations and future scope

- PDFs are capped at 4 MB because Vercel serverless functions accept request bodies up to about 4.5 MB. Direct-to-storage uploads (S3 or Cloudflare R2 presigned URLs) would remove this limit.
- GridFS shares the free Atlas tier's 512 MB with the rest of the data, which is enough for roughly a hundred typical papers.
- No password reset, email verification or email reminders yet.
- Possible next steps: full-text search inside PDFs, highlights linked to PDF pages, shared projects for group work, and import from a BibTeX file.
