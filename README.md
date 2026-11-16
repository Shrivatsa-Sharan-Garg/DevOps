# DevBridge

DevBridge is a crowdsourced platform connecting people who have real problems with developers who can build solutions. This branch holds the shared backend and AI core used by the web and mobile clients.

## Features

- Problem browsing, submission, upvotes, comments and solutions
- Semantic duplicate review: up to three suggested matches, with the user making the final decision
- Community reports that keep each same-problem submission as its own record
- On-demand SRS drafts that can be edited and versioned
- Dashboard metrics from stored records

AI inference supports a **dual-mode architecture (Cloud or Local)**: embeddings can run fully offline using a local `sentence-transformers` model (`paraphrase-MiniLM-L6-v2`) or via Cloudflare Workers AI, while OpenRouter handles SRS text generation. Data is stored in JSON files for development, so no database is needed. Without AI providers configured, duplicate review gracefully falls back to a labelled keyword check.

## Branches

| Branch    | Owns                                                     |
| --------- | -------------------------------------------------------- |
| `main`    | Shared `ml/` backend and AI core, plus the sync workflow |
| `web-dev` | React frontend and the MERN coursework skeleton          |
| `mob-dev` | Native Android application                               |

All shared backend and AI changes are made on `main`. On every push, `.github/workflows/sync-branches.yml` copies `ml/` to `web-dev` and `mob-dev`, leaving their other files alone. The sync stops if a branch has its own changes in `ml/`.

## Project structure

```text
ml/
├── requirements.txt   Shared Python dependencies
├── install.ps1        Creates ml/venv and installs requirements.txt
├── backend/           FastAPI application and tests (requirements.txt points to ../requirements.txt)
├── nlp/               Provider clients, matching, features and SRS logic (requirements.txt points to ../requirements.txt)
└── data/              Synthetic dataset and local runtime data
scripts/sync.sh

```

## Getting started

From the `ml` folder in PowerShell:

```powershell
.\install.ps1
.\venv\Scripts\Activate.ps1
python -m uvicorn backend.main:app --reload --port 8000

```

Add `-Test` to also install pytest. From `ml\backend` or `ml\nlp`, run `..\install.ps1` instead; it always uses `ml\venv`. Without the script, run `python -m venv venv` and `python -m pip install -r requirements.txt`.

The API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs). Demo data is created on the first start.

## Environment variables

Copy `ml/.env.example` to `ml/.env`. Configure your provider mode (`local` or `cloud`):

| Variable                | Purpose                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `AI_PROVIDER_MODE`      | Set to `local` (for offline sentence-transformers) or `cloud` (for Cloudflare Workers AI)         |
| `MODEL_PATH`            | Absolute path to local model weights (e.g., `paraphrase-MiniLM-L6-v2`) when running in local mode |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account (required if using cloud mode)                                                 |
| `CLOUDFLARE_API_TOKEN`  | Token with Workers AI read access (required if using cloud mode)                                  |
| `OPENROUTER_API_KEY`    | OpenRouter key for SRS generation                                                                 |

Only `:free` OpenRouter models are accepted. `MATCH_MIN_SIMILARITY` can be calibrated by running `python -m backend.scripts.calibrate_threshold`.

## Commands

Run these from `ml/` with the virtual environment active.

| Task                                    | Command                                          |
| --------------------------------------- | ------------------------------------------------ |
| Run tests (after `.\install.ps1 -Test`) | `python -m pytest`                               |
| Test real providers                     | `python -m pytest -m cloud`                      |
| Add missing demo data                   | `python -m backend.scripts.seed`                 |
| Restore demo data                       | `python -m backend.scripts.seed --reset --yes`   |
| Export training rows                    | `python -m backend.scripts.export_training_data` |

## Limitations

This is a local demonstration build. Sign-in uses demo profiles with no real authentication, JSON storage suits a single local server, and demo records are synthetic. Problem text is sent to external AI providers only with the user's consent.

## Licence

See [LICENSE](https://www.google.com/search?q=LICENSE).
