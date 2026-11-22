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
ml/                   FastAPI backend, MiniLM embeddings, NLP features and duplicate ANN
experiments/minilm/   Earlier standalone MiniLM experiment and download helper
```

## Getting started

You need Node.js and CPython 3.12 or 3.13. The API defaults to a local JSON store, so MongoDB is optional.

**API**, from the `ml` folder in PowerShell:

```powershell
.\run-ai.ps1
```

On first run the script creates `ml/.env` and the virtual environment, installs Python dependencies if needed, validates the local model, trains the ANN if its checkpoint is missing or incompatible, and starts the API at <http://127.0.0.1:8000/docs>. First-time dependency installation needs internet access. The model itself is loaded from disk only; it is never downloaded by the application.

Set `MINILM_MODEL_PATH` in `ml/.env` to the folder containing the downloaded `sentence-transformers/paraphrase-MiniLM-L6-v2` model files. For example: `MINILM_MODEL_PATH="T:/actual/path/to/paraphrase-MiniLM-L6-v2"`. This is the only model-specific setting needed for NLP and ANN. `AI_PROVIDER_MODE=local` is the default. Cloudflare credentials are optional and unused in this mode. OpenRouter is separate and is needed only for SRS text generation.

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

From `ml/`:

| Task | Command |
|---|---|
| Backend tests | `python -m pytest` |
| Force fresh grouped ANN training | `.\run-ai.ps1 -Retrain` |
| Train ANN without starting the server | `python -m nlp.classifier.train_model --no-feedback` |

The ANN consumes four ordered values: MiniLM cosine similarity, title similarity, Simplemma-based keyword overlap, and tag overlap. Its existing 4 input, 8 ReLU hidden, binary sigmoid-output `DuplicateMLPClassifier` is preserved. Trained output is saved to `ml/nlp/classifier/artifact_mlp_model.pkl`; the report is `ml/nlp/classifier/training_report.json`.

From `frontend/`:

| Task | Command |
|---|---|
| Simulation unit tests | `npm test` |
| Lint | `npm run lint` |
| Production build | `npm run build` |

MiniLM produces sentence vectors. Cosine similarity is calculated from those vectors; the ANN receives that scalar plus the three lexical/tag features. The model artifact records its provider and model and rejects artifacts trained with another provider. SRS generation remains separate on OpenRouter and may be unavailable while local duplicate matching continues.

## Limitations

Records marked "Demo data" are synthetic. The GitHub Pages build has no backend unless `VITE_API_BASE_URL` points at a running API; the Computer Networks and COA simulations work without one.

## Licence

See [LICENSE](LICENSE).
