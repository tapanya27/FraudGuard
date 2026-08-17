# FraudGuard

FraudGuard is an end-to-end fraud detection platform that combines a React-based analyst dashboard, a Node.js backend API, and a Python ML service for transaction scoring and investigation workflows. It's designed for security/finance teams who want an interactive UI to inspect transactions, see model predictions, and track investigations and audit trails.

## Key features
- Interactive React dashboard with:
  - Live threat feed, transaction table, analytics charts, and prediction results
  - Investigation panel, audit trail, and analyst progression UI elements
  - Theme toggle, system status and HUD components for operator workflows
- Backend API (Node.js) that serves data and handles authentication/authorization and prediction requests
- Separate ML microservice (Python) that exposes model predictions (training/research code kept under `research/`)
- Research notebook / scripts for modeling (PCA + XGBoost K-Fold example)

## Stack
- Languages: JavaScript (frontend + backend), Python (ML service), CSS/HTML for UI
- Frontend: React + Vite
- Backend: Node.js (single-file entrypoint `backend/server.js`)
- ML service: Python (see `ml_service/app.py` and `ml_service/requirements.txt`)
- Notable libraries (used across the repo): React, Vite, Express (Node), Flask (or similar) for ML service, XGBoost / scikit-learn (research code)

## How the repository is organized
```
frontend/        React + Vite web dashboard (src/, public/, package.json)
  src/
    components/  UI components: Navbar, TransactionTable, PredictionResult, AnalyticsCharts, InvestigationPanel, LiveThreatFeed, etc.
    pages/       App pages / routes
    services/    API client + helpers
    context/     React context / global state
backend/         Node.js API server (server.js, routes/, controllers/, services/, utils/)
  .env.example   environment vars template for backend
ml_service/      Python ML microservice (app.py, requirements.txt)
research/        modeling experiments (pca_xgboost_kfold.py)
deployment/      deployment manifests and configs (Docker / k8s / compose if present)
```

How it fits together:
- The frontend calls the backend API to retrieve transactions, investigations, and to request model predictions.
- The backend acts as the API gateway and business logic layer; for predictions it forwards requests to the ML service.
- The ML service runs the trained model(s) and returns a risk score / prediction that the backend stores or surfaces to the UI.
- Research scripts in `research/` hold training and evaluation code used to iterate on the models.

## Getting started (quick start)
Note: These are the shortest paths to get each component running locally. Check each component's folder (package.json, requirements.txt, .env.example) for exact scripts and variables.

1. Clone the repo
```bash
git clone https://github.com/tapanya27/FraudGuard.git
cd FraudGuard
```

2. Backend (API)
```bash
cd backend
# install dependencies
npm install
# copy and edit environment variables
cp .env.example .env
# start server (common script)
npm start
```
- The backend entrypoint is `backend/server.js`. Inspect `backend/.env.example` to populate required env vars (DB connection, API keys, ML service URL, JWT secrets, etc.).

3. Frontend (React dashboard)
```bash
cd frontend
npm install
# development server (Vite)
npm run dev
# build for production
npm run build
```
- Frontend runs via Vite (default dev port 5173). Configure API base URL in frontend environment variables or `src/services` settings.

4. ML service (Python)
```bash
cd ml_service
python -m venv venv
source venv/bin/activate   # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
# run service
python app.py
```
- `ml_service/app.py` exposes the model prediction endpoint that the backend calls. Check `ml_service/requirements.txt` for required Python packages.

## Environment variables
- Backend: see `backend/.env.example`. Typical variables include:
  - DB connection string (POSTGRES_URL or similar)
  - ML service URL (ML_SERVICE_URL)
  - JWT_SECRET / AUTH settings
  - PORT
- Frontend: configure API_BASE_URL or VITE_ prefixed env vars used by the frontend
- ML service: any model path, persistence locations, or service port (check `ml_service/app.py`)

## Development notes
- Frontend components to look at for UI changes: `frontend/src/components/*` (e.g., `TransactionTable.jsx`, `PredictionResult.jsx`, `InvestigationPanel.jsx`, `LiveThreatFeed.jsx`, `AnalyticsCharts.jsx`).
- Research and model training lives in `research/` (e.g., `pca_xgboost_kfold.py`) — use this for reproducing experiments or re-training models.
- A small test script for backend prediction flow exists: `backend/testPrediction.js` — useful for validating the prediction pipeline.

## Deployment
- Deployment manifests/configs may live in `deployment/`. If deploying containers, build the frontend and serve static files behind the backend or via a CDN; run backend and ml_service each in their own containers with environment variables set appropriately.
- Ensure secure networking between backend and ML service (internal network or service mesh), and protect model endpoints from unauthenticated access.

## Contributing
- Open an issue for any bug or feature request.
- Follow a branch-based workflow for contributions (feature branches, PRs).
- Add/update tests and include instructions for running them if you add behavioral changes.

## Research & Model reproduction
- The `research/pca_xgboost_kfold.py` file contains an example training/evaluation script (PCA + XGBoost with K-Fold). Use this as the starting point for model experiments.
- When retraining models, export model artifacts in a format the `ml_service` can load (e.g., joblib/pickle) and update the ML service to point at the new artifact.

## Troubleshooting & Notes
- If the API or ML service fails to start, check `.env` values and the console logs for missing dependencies or incorrect ports.
- To test predictions end-to-end, you can:
  - Start ml_service
  - Start backend (configured to point to ml_service)
  - Use `backend/testPrediction.js` or send requests from the frontend

## License
- No license file detected in the repository. Add an appropriate LICENSE file (e.g., MIT) if you intend to make the project open source.

## Contact / Maintainer
- Repository owner: @tapanya27
- Open issues or PRs on GitHub for questions, bugs, or feature requests.
