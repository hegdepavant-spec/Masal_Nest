# Masal AI — AI-Powered Real-Estate Lead Prioritization & Sales Copilot

Masal AI is an end-to-end sales copilot designed for real-estate salespeople to capture inbound customer leads, evaluate purchase intent using a **deterministic scoring framework**, extract structured intelligence using **Google ADK & Groq**, and prepare personalized call briefs and customer communications.

---

## 🌟 Key Highlights & Engineering Features

- **Full-Stack Working Software**: Not a prototype or mock. Real persistent SQLite database via SQLAlchemy 2.0 async, robust REST API in FastAPI, and modern dark-mode React frontend.
- **Explainable Deterministic Scoring**: Priority score (0–100) is calculated by documented business rules—not arbitrary LLM numbers. The LLM extracts structured evidence; our deterministic scoring engine applies the weights.
- **Google ADK (Agent Development Kit) Integration**:
  - **Lead Intelligence Agent**: Parses unstructured inquiries into structured JSON schemas (intent, key requirements, inferred requirements, objections, missing qualification checklist, recommended action).
  - **Sales Follow-up Agent**: Equipped with real `FunctionTool` implementations that query and mutate the SQLite database (lead context, task creation, status updates).
- **Stale Analysis Invalidation**: Automatically detects meaningful changes to customer requirements or budget and flags prior analyses as stale until recalculated.
- **Ground Truth Grounding**: Prompts strictly prevent hallucinations—agents cannot invent property availability, prices, or approval status.
- **High-Velocity UI/UX**: Dark mode, custom micro-animations, real-time search, interactive metric filtering, and quick copy-to-clipboard actions.

---

## 🏗️ Architecture & Technology Stack

```
                     ┌──────────────────────────────────────┐
                     │           React 19 + Vite            │
                     │  (Plus Jakarta Sans, Vanilla CSS)    │
                     └──────────────────┬───────────────────┘
                                        │ REST API (JSON)
                                        ▼
                     ┌──────────────────────────────────────┐
                     │          FastAPI Backend             │
                     │   (Pydantic v2, Typed Exceptions)    │
                     └───────┬──────────────────────┬───────┘
                             │                      │
                  ┌──────────▼─────────┐  ┌─────────▼────────┐
                  │   SQLAlchemy 2.0   │  │   Google ADK     │
                  │   Async Engine     │  │   Agent Runner   │
                  └──────────┬─────────┘  └─────────┬────────┘
                             │                      │ LiteLLM
                             ▼                      ▼
                  ┌────────────────────┐  ┌──────────────────┐
                  │    SQLite DB       │  │    Groq Cloud    │
                  │ (aiosqlite async)  │  │ (Llama-4 / 3.3)  │
                  └────────────────────┘  └──────────────────┘
```

### Backend
- **Framework**: FastAPI (Python 3.11+) with async routes and typed lifespan.
- **Database / ORM**: SQLAlchemy 2.0 Async Session + `aiosqlite` for persistent SQLite.
- **AI Agent Framework**: Google ADK (`google-adk`, `google-genai`) with `LiteLlm` model adapter connected to Groq.
- **Validation**: Pydantic v2 with strict type validation and regex parsing fallbacks.
- **Testing**: `pytest` and `pytest-asyncio` with in-memory SQLite isolation.

### Frontend
- **Core**: React 19, Vite, Javascript.
- **Design System**: Vanilla CSS with HSL-tailored tokens, glassmorphism, responsive CSS grid, and `lucide-react` icons.
- **Client**: Fetch-based modular API client (`api.js`) with toast feedback.

---

## 📐 Deterministic Scoring Framework

| Criterion | Max Points | Description |
| :--- | :---: | :--- |
| **Buying Timeline Urgency** | **30 pts** | Immediate / &lt;30 days (30 pts), 1–2 months (25 pts), 3–6 months (15 pts), exploring (&lt;5 pts) |
| **Purchase Intent Clarity** | **25 pts** | Buying (25 pts), Investing (20 pts), Renting (12 pts), Exploring (8 pts), Unclear (4 pts) |
| **Requirement & Budget Clarity** | **20 pts** | Clear budget + property type (20 pts), partial (10 pts), unstated (0 pts) |
| **Concrete Next Steps** | **15 pts** | Pre-approved loan, site visit request, or specific viewing inquiry |
| **Objection / Blocker Penalty** | **-10 pts** | Active financing blocker or severe handover constraint |
| **Total** | **100 pts** | **Hot** (≥ 70 pts) · **Warm** (40–69 pts) · **Cold** (&lt; 40 pts) |

*Rule: Missing information is treated as neutral/unknown, never punitive.*

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ (Node 24 recommended)
- Groq API Key (Optional for seeded demo review; required for real-time live LLM inference)

### 2. Backend Setup
```bash
cd backend

# (Optional) Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and supply your GROQ_API_KEY

# Seed realistic database with sample leads, analyses, tasks, and chats
python seed.py

# Run backend tests
python -m pytest -v

# Start FastAPI dev server on port 8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be available at: `http://127.0.0.1:8000` (API Docs: `http://127.0.0.1:8000/docs`).

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server on port 5173
npm run dev
```

Frontend will be available at: `http://127.0.0.1:5173`.

---

## 🧪 Testing

The test suite covers deterministic scoring calculations, lead CRUD operations, filtering, task status transitions, and dashboard metric aggregations:

```bash
cd backend
python -m pytest -v
```

All 8 test suites execute against isolated in-memory SQLite fixtures without network side-effects.

---

## 📂 Project Structure

```
masal-ai/
├── backend/
│   ├── app/
│   │   ├── agents/          # ADK Agent definitions, tools, prompts
│   │   │   ├── lead_intelligence.py
│   │   │   ├── sales_followup.py
│   │   │   ├── prompts.py
│   │   │   └── tools.py
│   │   ├── api/             # FastAPI routers & dependencies
│   │   │   ├── routes/      # leads, chat, tasks, dashboard
│   │   │   └── deps.py
│   │   ├── core/            # Config, settings, custom exceptions
│   │   ├── db/              # SQLAlchemy models, repositories, session
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Scoring, Lead, Task, Chat, Agent orchestration
│   │   └── main.py          # FastAPI application entry point
│   ├── tests/               # Pytest suite
│   ├── seed.py              # Sample database seeder
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, DashboardMetrics, LeadCard, Modals, ChatDrawer
│   │   ├── api.js           # REST API client
│   │   ├── App.jsx          # Root application coordinator
│   │   └── index.css        # Vanilla CSS Design System
│   ├── package.json
│   └── vite.config.js
└── README.md
```
