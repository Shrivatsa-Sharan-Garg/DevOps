# DevBridge

DevBridge is a crowdsourced platform connecting people who have real problems with developers who can build solutions. This branch holds the web application.

## Features

- Problem browsing with search, filters and sorting
- Duplicate review with up to three suggested matches, where the user makes the final decision
- Community reports, upvotes, comments and solutions
- Editable, versioned AI drafts of an SRS
- Animated dashboard with dark and light themes

## Branches

| Branch | Owns |
|---|---|
| `main` | Shared `ml/` backend and AI core, plus the sync workflow |
| `web-dev` | React frontend and the MERN coursework skeleton |
| `mob-dev` | Native Android application |

The `ml/` folder here is a synced copy from `main`. Make backend and AI changes on `main`, not on this branch.

## Project structure

```text
frontend/   React application
backend/    Separate MERN coursework skeleton, not used by the frontend
ml/         Shared FastAPI backend, synced from main
```

## Getting started

**API**, from the `ml` folder in PowerShell:

```powershell
.\install.ps1
.\venv\Scripts\Activate.ps1
python -m uvicorn backend.main:app --reload --port 8000
```

**Frontend**, from the `frontend` folder:

```powershell
npm install
npm run dev
```

Open <http://localhost:5173>. Demo data is created on the first start.

## Environment variables

Copy `ml/.env.example` to `ml/.env` to enable the AI features. Without keys, duplicate review uses a labelled keyword check.

| Variable | Purpose |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account, on the Workers Free plan |
| `CLOUDFLARE_API_TOKEN` | Token with Workers AI read access |
| `OPENROUTER_API_KEY` | OpenRouter key |

Keys stay on the server. Never put them in `frontend/`.

## Commands

From `frontend/`: `npm run build` and `npm run lint`. From `ml/`: `python -m pytest`.

## Limitations

This is a local demonstration build. Sign-in uses demo profiles with no real authentication, JSON storage suits a single local server, and records marked "Demo data" are synthetic.

## Licence

See [LICENSE](LICENSE).
