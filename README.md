# DevBridge

DevBridge is a crowdsourced platform connecting people who have real problems with developers who can build solutions. This branch holds the shared backend and AI core used by the web and mobile clients.

## Features

- Problem browsing, submission, upvotes, comments and solutions
- Semantic duplicate review: up to three suggested matches, with the user making the final decision
- Community reports that keep each same-problem submission as its own record
- On-demand SRS drafts that can be edited and versioned
- Dashboard metrics from stored records

AI inference runs on hosted free tiers only: Cloudflare Workers AI for embeddings and OpenRouter for SRS drafts. Data is stored in JSON files for development, so no database is needed. Without API keys, duplicate review falls back to a labelled keyword check.

## Branches

| Branch | Owns |
|---|---|
| `main` | Shared `ml/` backend and AI core, plus the sync workflow |
| `web-dev` | React frontend and the MERN coursework skeleton |
| `mob-dev` | Native Android application |

All shared backend and AI changes are made on `main`. On every push, `.github/workflows/sync-branches.yml` copies `ml/` to `web-dev` and `mob-dev`, leaving their other files alone. The sync stops if a branch has its own changes in `ml/`.

## Project structure

```text
ml/
├── backend/   FastAPI application and tests
├── nlp/       Provider clients, matching, features and SRS logic
├── data/      Synthetic dataset and local runtime data
├── requirements.txt       Runtime dependencies
├── requirements-dev.txt   Runtime dependencies plus pytest
└── install.ps1
scripts/sync.sh
```

## Getting started

From the `ml` folder in PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

Use `requirements-dev.txt` instead to include the test tools. `.\install.ps1` does the same setup, and `.\install.ps1 -Dev` adds the test tools. Neither needs a GPU, model downloads or a database.

The API documentation is at <http://localhost:8000/docs>. Demo data is created on the first start.

## Environment variables

Copy `ml/.env.example` to `ml/.env`. These enable the AI features, and the other settings have working defaults:

| Variable | Purpose |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account, on the Workers Free plan |
| `CLOUDFLARE_API_TOKEN` | Token with Workers AI read access |
| `OPENROUTER_API_KEY` | OpenRouter key |

Only `:free` OpenRouter models are accepted. `MATCH_MIN_SIMILARITY` has not been calibrated yet, so run `python -m backend.scripts.calibrate_threshold` once you have a Cloudflare key.

## Commands

Run these from `ml/` with the virtual environment active.

| Task | Command |
|---|---|
| Run tests | `python -m pytest` |
| Test real providers | `python -m pytest -m cloud` |
| Add missing demo data | `python -m backend.scripts.seed` |
| Restore demo data | `python -m backend.scripts.seed --reset --yes` |
| Export training rows | `python -m backend.scripts.export_training_data` |

## Limitations

This is a local demonstration build. Sign-in uses demo profiles with no real authentication, JSON storage suits a single local server, and demo records are synthetic. Problem text is sent to external AI providers only with the user's consent.

## Licence

See [LICENSE](LICENSE).
