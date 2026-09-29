# DevPilot client

Next.js frontend for DevPilot. Connects to the Spring Boot backend for GitHub
OAuth, repository indexing, and streaming chat over your own repositories.

## Requirements

- Node.js 20.9+ (developed against Node 22)
- A running DevPilot backend on port `8081`

## Setup

```bash
npm install
cp .env.example .env.local   # then edit if the backend is not on :8081
npm run dev
```

The app is served at http://localhost:3000.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8081` | Base URL of the backend API |

Because the variable is prefixed with `NEXT_PUBLIC_`, it is inlined into the
client bundle at build time. Restart the dev server after changing it.

## Sign-in

Sign-in starts at the backend, which redirects to GitHub. The OAuth app's
authorization callback URL must be:

```
http://localhost:8081/login/oauth2/code/github
```

The backend owns the `DEVPILOT_SESSION` cookie, so the frontend only needs the
`devpilot_auth` hint cookie that `proxy.ts` uses for optimistic route guarding.
The backend session is always the authority.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check without emitting |

## Theming

Dark mode is driven by `next-themes` writing a `.dark` class on `<html>`. All
`dark:` variants in this project are therefore class-scoped (see the
`@custom-variant` rule in `app/globals.css`) and do not follow the OS setting
unless the user picks "System".
