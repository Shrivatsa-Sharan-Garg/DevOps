# DevBridge

DevBridge is a crowdsourced platform connecting people who have real problems with developers who can build solutions. This branch holds the shared backend and AI core used by the web and mobile clients.

## Features

- Problem browsing, submission, upvotes, comments and solutions
- Semantic duplicate review: up to three suggested matches, each scored by a supervised MLP (cosine similarity, title similarity, keyword overlap and tag overlap), with the user making the final decision (same problem, related but different, or not related)
- Community reports that keep each same-problem submission as its own record and share the canonical problem's SRS
- ISO/IEC/IEEE 29148-inspired SRS drafts, generated automatically for every new problem whose author allows AI processing, then editable and versioned
- Dashboard metrics from stored records
- Email and password sign-in with hashed passwords and signed tokens

Embeddings come from Cloudflare Workers AI and SRS drafts come from OpenRouter. Records are stored in MongoDB; a JSON file store remains for offline demos and the test suite.

## Branches

| Branch    | Owns                                                     |
| --------- | -------------------------------------------------------- |
| `main`    | Shared `ml/` backend and AI core, plus the sync workflow |
| `web-dev` | React frontend and the MERN coursework skeleton          |
| `mob-dev` | Native Android application                               |

All shared backend and AI changes are made on `main`. On every push, `.github/workflows/sync-branches.yml` copies `ml/` to `web-dev` and `mob-dev`, leaving their other files alone. The sync stops if a branch has its own changes in `ml/`.

The local MiniLM experiment lives in `experiments/minilm/` on `web-dev`, with its own requirements. The shared application does not use it.

## Project structure

```text
ml/
├── requirements.txt   Shared Python dependencies, pinned
├── install.ps1        Creates ml/venv and installs requirements.txt
├── backend/           FastAPI application, repositories (MongoDB and JSON) and tests
├── nlp/               Provider clients, matching, features, MLP classifier, and SRS logic
└── data/              Synthetic dataset, demo problems and local runtime data
scripts/sync.sh

```

## Getting started

You need Python 3.12 or later and a MongoDB server (Community edition locally, or a MongoDB Atlas connection string).

From the `ml` folder in PowerShell:

```powershell
.\install.ps1
.\venv\Scripts\Activate.ps1
Copy-Item .env.example .env
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

```

Add `-Test` to also install pytest. From `ml\backend` or `ml\nlp`, run `..\install.ps1` instead; it always uses `ml\venv`. The script installs `requirements.txt` as written and never rewrites it.

On the first start against an empty database, the API seeds about 240 synthetic problems and, in development, three demo accounts. The API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

To run without MongoDB, set `DATA_STORE=json`.

If MongoDB runs on a different computer, `localhost` will not reach it. Set `MONGODB_URI` to that computer's LAN address and make sure its MongoDB accepts authenticated connections from your machine only. Check the connection without changing anything with `python -m backend.scripts.check_mongodb`.

### Demo accounts

These exist only when `APP_ENV=development`. They are never created in production.

| Name        | Email                     | Role      |
| ----------- | ------------------------- | --------- |
| Riya Sharma | `riya.sharma@example.com` | User      |
| Arjun Mehta | `arjun.mehta@example.com` | Developer |
| Neha Verma  | `neha.verma@example.com`  | Developer |

All three use the password set by `DEMO_ACCOUNT_PASSWORD`, which defaults to `DevBridge@2026`. Passwords are stored as scrypt hashes.

## Environment variables

Copy `ml/.env.example` to `ml/.env`. The main settings:

| Variable                | Purpose                                                                      |
| ----------------------- | ---------------------------------------------------------------------------- |
| `APP_ENV`               | `development`, `test` or `production`                                        |
| `DATA_STORE`            | `mongodb` (default) or `json`                                                |
| `MONGODB_URI`           | MongoDB connection string                                                    |
| `MONGODB_DATABASE`      | Database name, `devbridge` by default                                        |
| `AUTH_SECRET`           | Long random value for signing login tokens. Required in production           |
| `DEMO_ACCOUNT_PASSWORD` | Password for the development demo accounts                                   |
| `AI_PROVIDER_MODE`      | `cloud` to use the providers below, or `disabled`                            |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account, on the Workers Free plan                                 |
| `CLOUDFLARE_API_TOKEN`  | Token with Workers AI read access                                            |
| `OPENROUTER_API_KEY`    | OpenRouter key for SRS generation                                            |
| `DUPLICATE_MODEL_PATH`  | Trained MLP file, `nlp/classifier/artifact_mlp_model.pkl` by default         |

Only `:free` OpenRouter models are accepted. `MATCH_MIN_SIMILARITY` and `MATCH_MIN_KEYWORD_OVERLAP` decide which problems are shown as candidates. The MLP's own decision threshold is chosen on the validation split and saved with the model.

## Commands

Run these from `ml/` with the virtual environment active.

| Task                                    | Command                                                   |
| --------------------------------------- | --------------------------------------------------------- |
| Run tests (after `.\install.ps1 -Test`) | `python -m pytest`                                        |
| Include MongoDB integration tests       | Set `DEVBRIDGE_TEST_MONGODB_URI`, then `python -m pytest` |
| Test real providers                     | `python -m pytest -m cloud`                               |
| Add missing seed data (safe to repeat)  | `python -m backend.scripts.seed`                          |
| Back up, wipe and reseed                | `python -m backend.scripts.seed --reset --yes`            |
| Export training rows                    | `python -m backend.scripts.export_training_data`          |
| Check MongoDB without writing           | `python -m backend.scripts.check_mongodb`                 |
| Train the duplicate MLP                 | `python -m nlp.classifier.train_model`                    |
| Train without stored user feedback      | `python -m nlp.classifier.train_model --no-feedback`      |

The MongoDB integration tests create and drop their own `devbridge_test_*` databases and never touch other databases.

Training needs Cloudflare credentials, because the cosine feature comes from real embeddings. Vectors are cached in `data/embedding_cache.json`, so later runs cost nothing. Pairs are split by problem group so no problem appears in more than one of the training, validation and test sets. The results are printed and saved to `nlp/classifier/training_report.json`.

## Limitations

Demo records are synthetic. Problem text is sent to external AI providers only with the user's consent. If embeddings are unavailable, duplicate review falls back to keyword overlap and the MLP is skipped, because it needs the cosine feature. If the model file is missing or out of date, candidates are still shown for the user to review.

## Licence

See [LICENSE](LICENSE).
