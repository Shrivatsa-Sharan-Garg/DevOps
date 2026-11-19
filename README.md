# DevBridge

DevBridge is a crowdsourced platform connecting people who have real problems with developers who can build solutions. This branch holds the web application.

## Features

- Problem browsing with search, filters and sorting
- Duplicate review with up to three suggested matches, each with the duplicate model's suggestion, where the user makes the final decision
- Community reports, upvotes, comments and solutions
- SRS drafts generated automatically for new problems, then editable and versioned
- Animated dashboard with dark and light themes
- Email and password sign-in against the FastAPI backend
- **Computer Networks**: interactive simulations for all five course modules (encapsulation, CRC and parity, ARQ, ALOHA, CSMA/CD, subnetting, routing, TCP, DNS, HTTP and phishing checks)
- **Computer Organization and Architecture**: number systems, logic gates and Karnaugh maps, a step-by-step CPU simulator, cache and virtual memory, pipelining and performance, and assembly examples

## Branches

| Branch | Owns |
|---|---|
| `main` | Shared `ml/` backend and AI core, plus the sync workflow |
| `web-dev` | React frontend and the MERN coursework skeleton |
| `mob-dev` | Native Android application |

The `ml/` folder here is a synced copy from `main`. Make backend and AI changes on `main`, not on this branch.

## Project structure

```text
frontend/             React application
frontend/src/sim/     Simulation logic for Computer Networks and COA, with unit tests
backend/              Separate MERN coursework skeleton, not used by the frontend
ml/                   Shared FastAPI backend, synced from main
experiments/minilm/   Optional local MiniLM experiment with its own requirements, not used by the app
```

## Getting started

You need Node.js, Python 3.12 or later and a MongoDB server (local Community edition or Atlas).

**API**, from the `ml` folder in PowerShell:

```powershell
.\install.ps1
.\venv\Scripts\Activate.ps1
Copy-Item .env.example .env
python -m uvicorn backend.main:app --reload --port 8000
```

Add `-Test` to also install pytest. Set `DATA_STORE=json` in `ml/.env` to run without MongoDB.

**Frontend**, from the `frontend` folder:

```powershell
npm install
npm run dev
```

Open <http://localhost:5173/DevOps/>. On the first start against an empty database the API seeds about 240 synthetic problems.

### Demo accounts

In development (`APP_ENV=development`) the API creates three accounts. They are never created in production.

| Name | Email | Role |
|---|---|---|
| Riya Sharma | `riya.sharma@example.com` | User |
| Arjun Mehta | `arjun.mehta@example.com` | Developer |
| Neha Verma | `neha.verma@example.com` | Developer |

The password for all three is `DevBridge@2026`, unless `DEMO_ACCOUNT_PASSWORD` is changed.

## Environment variables

Settings live in `ml/.env`; see the README on `main` for the full list. The frontend reads one optional variable:

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API address for builds served elsewhere, such as GitHub Pages. The dev server proxies `/api` to port 8000 |

AI keys stay on the server. Never put them in `frontend/`.

## Commands

From `frontend/`:

| Task | Command |
|---|---|
| Simulation unit tests | `npm test` |
| Lint | `npm run lint` |
| Production build | `npm run build` |

From `ml/`, after `.\install.ps1 -Test`: `python -m pytest`. To retrain the duplicate model: `python -m nlp.classifier.train_model` (needs Cloudflare credentials).

## Limitations

Records marked "Demo data" are synthetic. The GitHub Pages build has no backend unless `VITE_API_BASE_URL` points at a running API; the Computer Networks and COA simulations work without one.

## Licence

See [LICENSE](LICENSE).
