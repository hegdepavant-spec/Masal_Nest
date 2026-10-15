# MasalNest
### Find the lead. Make the move.

> **AI-Powered Real Estate Intelligence & Deterministic Lead Prioritization Platform**

[![Backend Tests](https://img.shields.io/badge/backend%20tests-83%20passed-emerald)](file:///backend/tests)
[![Frontend Tests](https://img.shields.io/badge/frontend%20tests-47%20passed-emerald)](file:///frontend/src/__tests__)
[![Scoring Formula](https://img.shields.io/badge/scoring-v3.0.0%20deterministic-blue)](file:///backend/app/services/scoring_service.py)
[![UI Aesthetic](https://img.shields.io/badge/theme-white--first%20B2B%20SaaS-slate)](file:///frontend/src/styles/tokens.css)

MasalNest is a full-stack, enterprise-grade real estate CRM and sales prioritization platform designed specifically for real estate brokers and sales teams. It bridges the gap between raw, unstructured customer inquiries and high-velocity sales execution.

---

## Table of Contents

- [1. Executive Overview & Problem Statement](#1-executive-overview--problem-statement)
- [2. Key Features](#2-key-features)
- [3. Screenshots & Visual Walkthrough](#3-screenshots--visual-walkthrough)
- [4. Technology Stack](#4-technology-stack)
- [5. System Architecture](#5-system-architecture)
- [6. Project Directory Structure](#6-project-directory-structure)
- [7. Prerequisites](#7-prerequisites)
- [8. Complete Local Setup from Scratch](#8-complete-local-setup-from-scratch)
- [9. Quick Start Guide](#9-quick-start-guide)
- [10. End-to-End Workflow & Example Usage](#10-end-to-end-workflow--example-usage)
- [11. REST API Documentation](#11-rest-api-documentation)
- [12. Lead Scoring Methodology (v3.0.0)](#12-lead-scoring-methodology-v300)
- [13. AI Architecture & Grounding](#13-ai-architecture--grounding)
- [14. Testing & Verification](#14-testing--verification)
- [15. Security & Privacy](#15-security--privacy)
- [16. Known Limitations](#16-known-limitations)
- [17. Deployment Guide](#17-deployment-guide)
- [18. AI Usage Disclosure](#18-ai-usage-disclosure)
- [19. Roadmap](#19-roadmap)
- [20. License & Acknowledgments](#20-license--acknowledgments)

---

## 1. Executive Overview & Problem Statement

### The Problem in Real Estate Sales
Real estate agents handle dozens of incoming leads daily from web forms, WhatsApp messages, property portals, and phone inquiries. They face critical daily operational bottlenecks:
1. **Unstructured & Fragmented Inquiries**: Important details—such as budget readiness, loan pre-approvals, possession deadlines, and preferred micro-markets—are scattered inside long conversational paragraphs.
2. **Ambiguous Prioritization**: Traditional CRMs either score leads arbitrarily using black-box AI numbers that salespeople cannot trust, or rely solely on engagement history (penalizing high-intent leads that were just created).
3. **Missed Follow-Ups**: High-intent buyers move fast; without an urgent, date-bounded task pipeline, deals fall through the cracks.
4. **Context Switching**: Preparing for phone calls or logging post-call discoveries requires jumping between chat apps, spreadsheets, and notebooks.

### How MasalNest Solves This
MasalNest combines **AI extraction** with **transparent, deterministic scoring (v3.0.0)** and a **white-first B2B SaaS interface** (inspired by Linear, Attio, and Stripe Dashboard):
- **Intake Qualification**: Evaluates new and existing leads objectively on buying intent, financial readiness, requirement clarity, and purchase timeline—ensuring brand-new leads receive fair qualification without requiring prior call history.
- **Explainable Scoring**: Every score (0–100) breaks down into exact, verifiable points across 5 objective categories with an explicit mathematical audit trail.
- **LeadPilot AI Assistant**: Grounded strictly in lead context and equipped with real database function tools to answer questions, suggest actions, and schedule follow-ups without hallucinating property prices or inventory.
- **Action-Oriented Pipeline**: An overdue-first 4-stage follow-up task manager ensuring timely contact.

---

## 2. Key Features

### 🏢 Lead Intake & Structured Intelligence
- Captures customer name, phone, email, preferred location, property requirements, budget range (supporting Indian currency in ₹ Lakhs & Crores), timeline, and raw customer notes.
- Ingestion triggers asynchronous AI extraction to parse requirements, constraints, urgency signals, and missing discovery information into structured JSON.

### 📐 Deterministic Qualification Scoring v3.0
- **Pure Rule-Based Engine**: The LLM extracts facts; the deterministic scoring engine calculates the score. No hallucinated scores.
- **5 Category Breakdown (100 pts total)**:
  - *Purchase Intent* (30 pts max)
  - *Purchase Decision Urgency* (20 pts max)
  - *Budget & Financial Readiness* (20 pts max)
  - *Requirement Clarity & Fit* (20 pts max)
  - *Qualification Completeness & Feasibility* (10 pts max)
- **Thresholds**: Hot (≥ 70 pts), Warm (40–69 pts), Cold (< 40 pts).
- **Stale-Analysis Detection**: If a lead's budget, requirement, or timeline is modified after analysis, the system flags the record as `STALE` and prompts the agent to recalculate.

### 🤖 LeadPilot — Contextual AI Sales Assistant
- Integrated drawer grounded directly in the active customer's record, analysis, and task history.
- Equipped with database-backed function tools (`get_lead_context`, `create_followup_task`, `list_followup_tasks`, `update_task_status`, `reschedule_task`, `resolve_lead`).
- Automatically protects against duplicate task creation and identifies ambiguous customer queries.

### 📋 Follow-up Task Pipeline
- 4-stage visual task manager:
  1. **Overdue** (Red accent): Incomplete tasks whose due dates have passed.
  2. **Due Today** (Amber accent): Tasks scheduled for the current calendar date.
  3. **Upcoming** (Blue/Slate accent): Future scheduled actions sorted by nearest due date.
  4. **Completed** (Collapsible): Finished tasks with completion timestamps.
- One-click `+1 Day` rescheduling shortcut and duplicate submission protection.

### 📞 Call Briefs & Interaction Logging
- **One-Click Call Brief**: Generates an executive preparation brief highlighting talking points, discovered constraints, and recommended next steps.
- **Interaction Logger**: Salespeople record call outcomes (e.g. Connected, Left Voicemail, Site Visit Scheduled) and notes. LeadPilot can automatically extract proposed lead updates for human approval.

### 📈 Market Insights
- Provides indicative property price estimates for Indian localities (e.g., Whitefield, Indiranagar, HSR Layout).
- Features a budget-fit assessment and tabular price per sq ft ranges.
- **Mandatory Legal Disclaimer**: *AI-generated indicative property price estimates · Not verified appraisal data*.

### 🎨 Dual CRM Presentation: Card Grid & Dense Table View
- **Card View**: Spacious white cards with Indian currency badges, timeline pills, and a collapsible "Why this score?" factor contribution drawer.
- **Dense Table View (`.crm-table`)**: An Attio/Linear-style high-density data table with monospaced contacts, tabular numerals, and quick action buttons.

---

## 3. Screenshots & Visual Walkthrough

> Real screenshots captured from the running application:

| View | Screenshot | Description |
| :--- | :--- | :--- |
| **Leads Pipeline (Card View)** | ![Leads Card View](docs/screenshots/leads_card_view.png) | High-contrast white surfaces, metric summaries, and priority badges. |
| **Dense Data Table View** | ![Leads Table View](docs/screenshots/leads_table_view.png) | Linear/Attio-style high density table with tabular numerals for ₹ values. |
| **Lead Detail & Scoring Breakdown** | ![Lead Details](docs/screenshots/lead_details_scoring.png) | 5-factor mathematical audit, stale warning banner, and missing info checklist. |
| **Follow-up Task Pipeline** | ![Tasks Pipeline](docs/screenshots/followup_tasks_pipeline.png) | 4-stage hierarchy (Overdue, Due Today, Upcoming, Collapsible Completed). |
| **Market Insights** | ![Market Insights](docs/screenshots/market_insights.png) | Indicative pricing estimates with mandatory appraisal disclaimer. |
| **Mobile Responsive View** | ![Mobile View](docs/screenshots/mobile_responsive.png) | Clean vertical stacking for tablet and mobile devices (375px+). |

*Note: For public demos, update the placeholders below:*
- **Live Application**: `TODO: Add deployment URL (e.g., https://masalnest.vercel.app)`
- **Demo Video Walkthrough**: `TODO: Add public video URL (e.g., Loom / YouTube demo)`

---

## 4. Technology Stack

| Layer | Technology | Version | Purpose in MasalNest |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^19.2.8` | Component-based interactive user interface. |
| **Build Tool & Dev Server**| Vite | `^8.3.0` | Ultra-fast HMR and optimized production bundle builder. |
| **Styling & Design System**| Vanilla CSS / CSS Tokens | Modern CSS3 | Custom white-first design tokens (`tokens.css`), 4px grid, tabular numerals. |
| **Icons** | Lucide React | `^1.16.0` | Clean, lightweight SVG iconography. |
| **Frontend Testing** | Vitest + Testing Library | `^5.0.4` | Component unit and integration testing with DOM mocking. |
| **Frontend Linter** | Oxlint | `^1.81.0` | High-performance JavaScript/JSX linting. |
| **Backend Framework** | FastAPI | `>=0.110.0` | Asynchronous high-performance REST API with typed exceptions. |
| **ASGI Web Server** | Uvicorn | `>=0.28.0` | Production ASGI web server with auto-reload capabilities. |
| **Data Validation** | Pydantic v2 & Pydantic Settings | `>=2.6.4` | Strict request/response schema validation and environment management. |
| **ORM & Database Engine**| SQLAlchemy (Async) | `>=2.0.28` | Async ORM session handling and schema modeling. |
| **Database Driver** | aiosqlite | `>=0.20.0` | Async driver for zero-configuration persistent SQLite storage. |
| **Database** | SQLite | 3.x | Persistent local transactional database (`masal_ai.db`). |
| **AI Agent Orchestration** | Google ADK (`google-adk`) | `>=0.1.0` | Agent execution runner, session context, and tool definitions. |
| **LLM Gateway & Client** | LiteLLM | `>=1.30.0` | Multi-model adapter with request sanitation for Groq cloud endpoints. |
| **LLM Provider** | Groq Cloud | `Llama-3.3 / Llama-4` | High-speed LLM inference for extraction and conversational chat. |
| **Backend Testing** | Pytest & pytest-asyncio | `>=8.1.0` | Async unit and integration test suite with in-memory DB fixtures. |

---

## 5. System Architecture

### Component & Data Flow

```mermaid
graph TD
    User([Salesperson / Real Estate Agent])
    
    subgraph Frontend ["React 19 + Vite Frontend (Port 5173)"]
        UI[White-First CRM Interface]
        CardsView[Card Grid View]
        TableView[Dense Table View]
        Drawer[LeadPilot Chat Drawer]
        TasksView[Task Pipeline View]
        APIClient["API Client (api.js)"]
    end
    
    subgraph Backend ["FastAPI Backend (Port 8000)"]
        Router["API Router (/api/v1)"]
        LeadService[Lead Service]
        ScoringService["Deterministic Scoring v3.0"]
        FollowupService[Follow-up Service]
        MarketService[Market Insights Service]
        AgentService[ADK Agent Runner]
    end
    
    subgraph Persistence ["Data Layer"]
        SQLA["SQLAlchemy 2.0 Async"]
        DB[("Persistent SQLite\nmasal_ai.db")]
    end
    
    subgraph ExternalAI ["External AI Provider"]
        GroqClient["Custom Groq LiteLLM Client\n(Sanitized Payloads)"]
        GroqCloud["Groq Cloud API\n(Llama-3.3-70b / Llama-4-Scout)"]
    end

    User --> UI
    UI --> CardsView
    UI --> TableView
    UI --> Drawer
    UI --> TasksView
    CardsView & TableView & Drawer & TasksView --> APIClient
    
    APIClient -->|JSON over HTTP| Router
    Router --> LeadService
    Router --> FollowupService
    Router --> MarketService
    
    LeadService --> AgentService
    LeadService --> ScoringService
    FollowupService --> SQLA
    
    AgentService --> GroqClient
    MarketService --> GroqClient
    GroqClient -->|HTTPS API Key| GroqCloud
    
    AgentService -->|Function Tools| FollowupService
    ScoringService --> LeadService
    LeadService --> SQLA
    SQLA --> DB
```

### Lead Analysis Execution Sequence
1. **Intake**: A new lead is submitted via the UI form or API (`POST /api/v1/leads`).
2. **Persistence**: The lead record is saved in SQLite with status `new` and priority `unscored`.
3. **Structured Extraction**: The `LeadIntelligenceAgent` analyzes customer notes using Groq/ADK, returning structured JSON (intent, requirements, constraints, missing information).
4. **Deterministic Calculation**: Structured evidence is passed directly to `scoring_service.py` (v3.0.0), calculating exact points for all 5 categories.
5. **Reconciliation**: Total score, classification category (Hot/Warm/Cold), and factor contributions are persisted to `lead_analyses`.
6. **Delivery**: The frontend updates with complete factor explanations, actionable call briefs, and missing discovery checkboxes.

---

## 6. Project Directory Structure

```
masal-ai/
├── DESIGN.md                   # Comprehensive UI/UX design system specification
├── README.md                   # Project documentation (this document)
├── docs/
│   └── screenshots/            # Verified application screenshots
│       ├── leads_card_view.png
│       ├── leads_table_view.png
│       ├── lead_details_scoring.png
│       ├── followup_tasks_pipeline.png
│       ├── market_insights.png
│       └── mobile_responsive.png
│
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI entry point, CORS, lifespan, and error handlers
│   │   ├── agents/             # Google ADK agent definitions & custom Groq client
│   │   │   ├── groq_client.py  # Message sanitizer for Groq endpoint compatibility
│   │   │   ├── lead_intelligence.py # Lead extraction ADK agent
│   │   │   ├── sales_followup.py    # LeadPilot conversational assistant
│   │   │   ├── tools.py        # 6 database function tools for LeadPilot
│   │   │   └── prompts.py      # System prompts & extraction schemas
│   │   ├── api/
│   │   │   ├── deps.py         # Database session dependency injection
│   │   │   └── routes/         # REST API routers
│   │   │       ├── leads.py    # Lead CRUD, analysis, recalculation, call briefs
│   │   │       ├── chat.py     # LeadPilot chat & message history
│   │   │       ├── tasks.py    # Follow-up task pipeline management
│   │   │       ├── dashboard.py# Aggregated pipeline metrics
│   │   │       └── market_insights.py # Locality indicative pricing
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic BaseSettings (.env loader)
│   │   │   └── exceptions.py   # Domain error classes & HTTP status mappings
│   │   ├── db/
│   │   │   ├── models.py       # SQLAlchemy ORM models (Lead, Analysis, Task, Message)
│   │   │   ├── session.py      # Async database engine & sessionmaker
│   │   │   └── repositories/   # Abstracted DB operations (Lead, Task, Analysis)
│   │   ├── schemas/            # Pydantic v2 request/response contracts
│   │   └── services/           # Core business logic
│   │       ├── scoring_service.py # Deterministic Scoring v3.0.0
│   │       ├── timeline_service.py# Natural language timeline normalization
│   │       ├── lead_service.py    # Lead lifecycle orchestration
│   │       ├── followup_service.py# Task pipeline business rules
│   │       └── market_insights_service.py # Indicative pricing service
│   ├── tests/                  # 8 Pytest suites (83 passing tests)
│   ├── .env.example            # Backend environment variable template
│   ├── requirements.txt        # Python backend dependencies
│   ├── pytest.ini              # Pytest configuration
│   ├── seed.py                 # Realistic demo data seed script (12+ leads & tasks)
│   └── migrate_v3.py           # Database migration helper for v3 scoring
│
└── frontend/
    ├── index.html              # HTML5 entry point with Plus Jakarta Sans & Inter
    ├── package.json            # Node.js dependencies & scripts
    ├── vite.config.js          # Vite build & Vitest test runner configuration
    ├── src/
    │   ├── main.jsx            # React root mount
    │   ├── App.jsx             # Top-level workspace layout, tabs, & view switcher
    │   ├── api.js              # Modular fetch-based API client
    │   ├── index.css           # Global CSS foundations & table layout
    │   ├── styles/
    │   │   └── tokens.css      # White-first B2B SaaS token system (colors, radii, shadows)
    │   ├── components/         # Modular React components
    │   │   ├── Navbar.jsx           # Top navigation bar with active tab indicators
    │   │   ├── DashboardMetrics.jsx # 8-card metric dashboard with priority filter links
    │   │   ├── LeadCard.jsx         # Lead card with "Why this score?" drawer
    │   │   ├── LeadDetailModal.jsx  # Detailed lead modal with 5-factor scoring audit
    │   │   ├── CreateLeadModal.jsx  # Inbound lead capture dialog
    │   │   ├── TaskModal.jsx        # Follow-up task creation modal
    │   │   ├── CallBriefModal.jsx   # One-click phone call preparation brief
    │   │   ├── LogInteractionModal.jsx # Call outcome logger with AI update extraction
    │   │   ├── ChatDrawer.jsx       # LeadPilot conversational slide-over drawer
    │   │   ├── MarketInsights.jsx   # Locality property price estimator
    │   │   └── Toast.jsx            # Non-blocking notification alerts
    │   └── __tests__/          # 6 Vitest test suites (47 passing tests)
```

---

## 7. Prerequisites

Before installing, ensure your development machine has the following tools installed:

- **Python**: Version `3.11` or higher (`python --version`)
- **Node.js**: Version `18.0.0` or higher (Node 20 or 24 LTS recommended; `node --version`)
- **Package Manager**: `npm` version 9+ (`npm --version`)
- **Git**: For version control (`git --version`)
- **Groq API Key** *(Optional for seeded evaluation; required for live AI analysis & chat)*:
  - Obtain a free API key at [Groq Console](https://console.groq.com/keys).

---

## 8. Complete Local Setup from Scratch

Follow these step-by-step instructions. Windows PowerShell commands are shown first, followed by macOS/Linux equivalents.

### Step A: Clone the Repository
```powershell
# Clone the repository
git clone <REPOSITORY_URL_OR_LOCAL_PATH>
cd masal-ai
```
*(Replace `<REPOSITORY_URL_OR_LOCAL_PATH>` with your Git repository URL).*

---

### Step B: Configure & Seed the Backend

#### 1. Navigate to the backend directory
```powershell
cd backend
```

#### 2. Create and activate a Python virtual environment
- **Windows PowerShell**:
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
- **macOS / Linux**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

#### 3. Install backend dependencies
```powershell
pip install -r requirements.txt
```

#### 4. Configure environment variables
Copy the example environment configuration:
- **Windows PowerShell**:
  ```powershell
  Copy-Item .env.example .env
  ```
- **macOS / Linux**:
  ```bash
  cp .env.example .env
  ```

Open `.env` in your text editor and configure the variables:
```ini
APP_NAME="MasalNest"
DEBUG=False
DATABASE_URL="sqlite+aiosqlite:///./masal_ai.db"
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

# Supply your Groq API key for live AI inferences:
GROQ_API_KEY="gsk_your_actual_groq_api_key_here"
GROQ_MODEL_NAME="meta-llama/llama-4-scout-17b-16e-instruct"
GROQ_TIMEOUT_SECONDS=30
GROQ_MAX_RETRIES=2

# Qualification Scoring Thresholds
SCORE_HOT_THRESHOLD=70
SCORE_WARM_THRESHOLD=40
```

> **Security Note**: Never commit your `.env` file to version control. The backend never exposes API keys to client browsers.

#### 5. Seed the Database
Initialize the database schema and populate realistic Indian real estate leads, pre-calculated v3.0 scores, follow-up tasks, and chat history:
```powershell
python seed.py
```
*Output: `Seeding complete! Successfully seeded 12 leads, 11 analyses, 17 follow-up tasks, and 8 chat messages.`*

#### 6. Start the FastAPI Server
```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is now running at `http://127.0.0.1:8000`.
- Health Check: `http://127.0.0.1:8000/health`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

---

### Step C: Configure & Start the Frontend

Open a **second terminal window** and navigate to the frontend directory:

#### 1. Navigate to frontend
```powershell
cd masal-ai/frontend
```

#### 2. Install Node dependencies
```powershell
npm install
```

#### 3. (Optional) Configure API Base URL
By default, the frontend connects to `http://localhost:8000/api/v1`. If running on a different port or host, create `.env` in the `frontend/` directory:
```ini
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

#### 4. Start the Vite Development Server
```powershell
npm run dev
```
The frontend is now running at `http://localhost:5173`. Open this URL in any modern web browser.

---

## 9. Quick Start Guide

For developers returning to the project, run these commands:

### Terminal 1 — Backend
```powershell
cd masal-ai/backend
.\venv\Scripts\Activate.ps1   # (On macOS/Linux: source venv/bin/activate)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2 — Frontend
```powershell
cd masal-ai/frontend
npm run dev
```

Visit **`http://localhost:5173`**. To terminate either server, press `Ctrl + C` in its respective terminal window.

---

## 10. End-to-End Workflow & Example Usage

Here is a typical workflow demonstrating how an agent qualifies a high-intent inbound lead:

### 1. Inbound Lead Data
- **Customer**: Rahul Mehta
- **Location**: Whitefield, Bengaluru
- **Budget**: ₹2.5 - 3.0 Cr
- **Property Requirement**: 3 BHK apartment in a gated community with covered parking.
- **Purchase Decision Timeline**: Within 7 days
- **Possession Requirement**: Possession within 3 months (~90 days).
- **Customer Note**:
  > *"I'm looking to buy a 3 BHK apartment in Whitefield, Bengaluru, within the next 7 days. My budget is ₹2.5–3 crore. I have home-loan pre-approval and funds ready for the down payment. I need covered parking, a gated community and possession within 3 months. I am the final decision-maker. Please share suitable options and help me arrange a site visit this Saturday."*

### 2. Step-by-Step System Walkthrough
1. **Capture Lead**: Click `+ New Lead` on the top navbar, fill in the form with the information above, and ensure *Auto-run AI analysis* is checked. Click **Save Lead**.
2. **Deterministic Qualification v3.0**:
   - *Purchase Intent*: `buying` (20 base pts) + self-declared decision-maker & active search (+10 pts) = **30/30 pts**
   - *Timeline Urgency*: Purchase decision "Within 7 days" = **20/20 pts**
   - *Budget & Readiness*: Explicit ₹2.5–3 Cr budget (10 pts) + pre-approved loan & down payment ready (10 pts) = **20/20 pts**
   - *Requirement Clarity*: 3 BHK gated community (10 pts) + Whitefield micro-market (10 pts) = **20/20 pts**
   - *Qualification Completeness*: Operational 3-month possession requirement recognized as feasible = **9/10 pts**
   - **Total Score**: **99/100 (HOT LEAD)**.
3. **Inspect the Score**: Click on Rahul Mehta's card to open the **Lead Detail Modal**. Notice the complete mathematical reconciliation table and the checklist highlighting any missing discovery items (e.g. *Floor preference*, *Vastu compliance*).
4. **Prepare for Call**: Click **Prepare for Call** to generate an instant bulleted preparation sheet.
5. **Contextual Chat with LeadPilot**: Click **LeadPilot Chat** and type:
   > *"Schedule a site visit for Rahul Mehta this Saturday at 11 AM."*
   LeadPilot invokes its database tool `create_followup_task`, creates the task, and confirms the schedule.
6. **Task Pipeline**: Switch to the **Tasks** tab. The site visit appears under the **Upcoming** section with an action badge `SITE_VISIT`. If the date passes, it automatically moves to the **Overdue** bucket with a red warning accent.

---

## 11. REST API Documentation

Base URL: `http://localhost:8000/api/v1`

### 1. System Endpoints
| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Health check endpoint for container and deployment monitors. | None |
| `GET` | `/` | Root endpoint displaying application version and documentation link. | None |

### 2. Leads & Scoring
| Method | Route | Description | Request Body / Query Params | Response |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/leads` | Create a new lead record. | `customer_name` (req), `location`, `property_requirement`, `budget`, `buying_timeline`, `customer_message`, `phone`, `email` | `LeadResponse` (201 Created) |
| `GET` | `/api/v1/leads` | List leads with filtering and sorting. | `search`, `priority` (hot/warm/cold), `status_filter`, `sort_by`, `sort_order` | `list[LeadResponse]` |
| `GET` | `/api/v1/leads/{id}` | Retrieve complete lead details with analysis & tasks. | None | `LeadDetailResponse` |
| `PATCH` | `/api/v1/leads/{id}` | Update lead fields (automatically marks analysis as `STALE` if key fields change). | `LeadUpdate` schema | `LeadResponse` |
| `DELETE` | `/api/v1/leads/{id}` | Delete a lead and all associated records. | None | 204 No Content |
| `POST` | `/api/v1/leads/{id}/analyze` | Trigger asynchronous AI extraction and deterministic v3.0 scoring. | None | `AnalysisResponse` |
| `POST` | `/api/v1/leads/{id}/brief` | Generate a call preparation brief. | None | `{"lead_id": str, "call_brief": str}` |
| `POST` | `/api/v1/leads/{id}/extract-interaction` | Extract structured lead updates from interaction notes. | `{"outcome": str, "notes": str}` | `InteractionExtractResponse` |
| `POST` | `/api/v1/leads/recalculate-scores` | Batch recalculate all scores using v3.0 formula without LLM re-invocation. | None | `{"message": str, "recalculated_count": int}` |
| `POST` | `/api/v1/leads/{id}/recalculate-score` | Recalculate single lead score deterministically. | None | `LeadDetailResponse` |

### 3. LeadPilot Conversational Chat
| Method | Route | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/leads/{id}/chat` | Send a contextual message to LeadPilot. | `{"message": str}` | `ChatResponse` |
| `GET` | `/api/v1/leads/{id}/chat/history` | Retrieve chat message trajectory for lead. | `limit` (int, default 50) | `ChatHistoryResponse` |

### 4. Follow-up Tasks
| Method | Route | Description | Request Body / Query Params | Response |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/tasks` | Create a new follow-up task. | `lead_id`, `title`, `description`, `action_type`, `due_date` | `TaskResponse` |
| `GET` | `/api/v1/tasks` | List tasks with filters. | `lead_id`, `status` (pending/completed), `due_before` | `list[TaskResponse]` |
| `PATCH` | `/api/v1/tasks/{id}` | Update task status or due date. | `{"status": str, "due_date": str}` | `TaskResponse` |
| `DELETE` | `/api/v1/tasks/{id}` | Delete a follow-up task. | None | 204 No Content |

### 5. Dashboard Metrics & Market Insights
| Method | Route | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/dashboard/metrics` | Retrieve pipeline lead counts and task urgency tallies. | None | `DashboardMetrics` |
| `POST` | `/api/v1/market-insights/analyze` | Generate an indicative property price estimate. | `{"locality": str, "city": str, "property_type": str, "customer_budget": str}` | `MarketInsightsResponse` |

---

## 12. Lead Scoring Methodology (v3.0.0)

MasalNest uses **Qualification Scoring v3.0.0**. The model evaluates **objective intake qualification and buying potential**, intentionally decoupling score generation from prior call counts or website activity. This guarantees that newly created high-intent prospects are not penalized compared to older leads.

### Category Breakdown (Max 100.0 Points)

| Category | Max Points | Evaluation Rules |
| :--- | :---: | :--- |
| **1. Purchase Intent** | **30.0 pts** | • Base points: `buying` (20 pts), `investing` (18 pts), `renting` (8 pts), `exploring` (4 pts), `unclear` (0 pts).<br>• High-intent bonuses: Active search / visit requested (+5 pts), self-declared decision-maker (+3 pts), explicit ready buyer (+5 pts). Max capped at 30 pts. |
| **2. Purchase Decision Urgency** | **20.0 pts** | Evaluated via normalized decision timeline (days):<br>• ≤ 7 days / immediate: **20 pts**<br>• 8–15 days: **17 pts**<br>• 16–30 days: **14 pts**<br>• 1–2 months (31–60 days): **10 pts**<br>• 2–3 months (61–90 days): **6 pts**<br>• > 90 days / exploring: **3 pts**<br>• Unspecified: **0 pts** |
| **3. Budget & Financial Readiness** | **20.0 pts** | • **Budget Clarity (10 pts)**: Explicit realistic budget (10 pts), approximate range (5 pts), unstated (0 pts).<br>• **Financing Readiness (10 pts)**: Cash ready / self-funded (10 pts), pre-approved home loan (8 pts), standard loan planned (5 pts), unstated (0 pts). |
| **4. Requirement Clarity & Fit** | **20.0 pts** | • **Property Specifics (10 pts)**: Exact configuration e.g. 3 BHK villa + parking (10 pts), broad category e.g. apartment (5 pts), unstated (0 pts).<br>• **Micro-market (10 pts)**: Specific locality/neighborhood (10 pts), broad city only (5 pts), unstated (0 pts). |
| **5. Qualification Completeness** | **10.0 pts** | Feasibility check across budget, location, property type, valid contact info, and realistic handover constraints. |
| **Deductions (Material Risks)** | **0 to -10 pts** | Applied only for verified material contradictions (e.g. rejected loan, active legal dispute, irreconcilable possession mismatch). |

### Important Normalization Distinctions
- **Purchase Decision Timeline vs. Possession Deadline**: If a customer states *"Need to buy within 10 days, but possession needed in 6 months"*, the 10-day timeline drives Urgency scoring (**17 pts**), while the 6-month possession requirement is treated as an operational requirement—never as a delayed purchase deadline.
- **Missing Information is Neutral**: Missing data yields 0 credit in that specific factor; it is never penalized with negative points.
- **Classification Thresholds**:
  - **🔥 Hot**: `Score ≥ 70` (Immediate, high-priority sales follow-up)
  - **⚡ Warm**: `Score 40 – 69` (Active prospect, nurturing required)
  - **❄️ Cold**: `Score < 40` (Early discovery / low initial urgency)

---

## 13. AI Architecture & Grounding

### Safe LLM Orchestration
1. **Separation of Concerns**: The LLM is used exclusively for *semantic extraction* (parsing unstructured text into JSON) and *conversational sales assistance*. It **never** calculates the numerical score.
2. **Groq LiteLLM Client (`app/agents/groq_client.py`)**: A custom message sanitizer removes vendor-specific tokens (e.g., `reasoning_content`, `thinking_blocks`) before sending requests to Groq, preventing API schema errors.
3. **Anti-Hallucination Guardrails**:
   - Prompts strictly forbid LeadPilot from fabricating property availability, square footage prices, or approval statuses.
   - If an agent asks *"What units are available in Whitefield?"*, LeadPilot explicitly clarifies that it does not have access to live MLS inventory and asks the salesperson to check current project sheets.
4. **Graceful Degradation**: If Groq API credentials are missing or the service times out, the backend handles the exception gracefully, returning clean HTTP error codes without corrupting database state.

---

## 14. Testing & Verification

The project includes thorough, automated test suites for both backend and frontend layers:

### Running Backend Tests (Pytest)
```powershell
cd backend
python -m pytest -v
```
- **83 tests passing** across 8 test suites:
  - `test_scoring.py`: Mathematical verification of all v3.0 rules, factor weights, and edge cases.
  - `test_timeline.py`: Natural language timeline normalization and boundary handling.
  - `test_leads_api.py`: CRUD endpoints, stale-analysis triggers, and recalculation routes.
  - `test_tasks_api.py`: Task status transitions, due-date filters, and metric calculations.
  - `test_market_insights.py`: Schema validation, prompt formatting, and error handling.
  - `test_chat_api.py` & `test_agents.py`: Contextual chat, tool execution, and mock LLM runners.

### Running Frontend Tests (Vitest)
```powershell
cd frontend
npm test
```
- **47 tests passing** across 6 test suites:
  - `leadCreationFlow.test.js`: Modal form inputs, auto-analyze toggle, and submit handlers.
  - `LeadDetailModal.test.jsx`: Score banner rendering and factor audit tables.
  - `taskPipelineAndBranding.test.jsx`: 4-stage task partitioning (Overdue vs. Today vs. Upcoming), timezone safety, and duplicate submission guards.
  - `LogInteractionModal.test.jsx`: Call outcome selection and AI proposal reviews.
  - `marketInsights.test.jsx`: Indicative pricing form rendering, loading states, and legal disclaimer visibility.

### Production Build & Lint Validation
```powershell
cd frontend
# Run production build validation (syntax, JSX, and module imports)
npm run build

# (Optional) Run fast code linter (requires native platform bindings)
npm run lint
```
- Production bundle transpiles and builds cleanly in **< 800ms** (`dist/` output size: ~357 kB JS, ~11 kB CSS gzip).

---

## 15. Security & Privacy

1. **Credential Isolation**: The `GROQ_API_KEY` is loaded exclusively inside the FastAPI backend via Pydantic settings. It is **never** bundled or leaked to the client application.
2. **Strict CORS Policy**: Configured in `app/main.py` to allow requests only from authorized origins (defaulting to local Vite ports `5173` and `3000`).
3. **Pydantic Validation**: All inbound REST payloads pass through strict Pydantic v2 schemas to prevent SQL injection or malicious type-juggling.
4. **Customer Data Protection**: Customer phone numbers and emails are validated. Note fields are treated as sensitive commercial information.
5. **No Secret Tracking**: The repository `.gitignore` explicitly excludes `.env`, `*.db`, `*.sqlite`, `venv/`, and `node_modules/`.

---

## 16. Known Limitations

In the interest of full technical transparency:
- **Heuristic Prioritization**: The v3.0 priority score is a deterministic qualification heuristic based on real estate sales domain logic. It is not an ML model trained on historical closed-won conversion data.
- **Indicative Market Data**: Market Insights produces AI-generated estimates based on general LLM knowledge. It does not query real-time property MLS registries or official land valuation databases.
- **Local Storage Architecture**: SQLite via `aiosqlite` is optimized for local development, small sales teams, and portfolio demonstrations. For concurrent enterprise deployments (> 1,000 concurrent agents), migrate to PostgreSQL.
- **External Dependency**: Live AI features (extraction, LeadPilot chat, market insights) require a valid Groq API key and an active internet connection.

---

## 17. Deployment Guide

### Suggested Production Architecture

```
Internet --> Cloudflare (SSL / DNS)
                 |
        +--------+--------+
        |                 |
        v                 v
[Vercel / Netlify]  [Render / Fly.io / Railway]
  React 19 Frontend     FastAPI Backend (Docker/Uvicorn)
  (Static SPA)          |
                        +---> [PostgreSQL / Supabase]
                        +---> [Groq Cloud API]
```

### 1. Frontend Hosting (Vercel or Netlify)
1. Link your GitHub repository to Vercel/Netlify.
2. Set **Root Directory** to `frontend`.
3. Set **Build Command** to `npm run build`.
4. Set **Output Directory** to `dist`.
5. Set Environment Variable:
   ```ini
   VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
   ```

### 2. Backend Hosting (Render, Fly.io, or Railway)
1. Deploy as a Python web service pointing to the `backend/` folder.
2. Start Command:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
3. Set Environment Variables:
   ```ini
   APP_NAME="MasalNest"
   DEBUG=False
   DATABASE_URL="postgresql+asyncpg://user:pass@host/dbname"
   CORS_ORIGINS=["https://your-frontend.vercel.app"]
   GROQ_API_KEY="gsk_your_groq_api_key"
   GROQ_MODEL_NAME="meta-llama/llama-4-scout-17b-16e-instruct"
   ```
4. Configure persistent disk storage if retaining SQLite, or swap `DATABASE_URL` to PostgreSQL.

---

## 18. AI Usage Disclosure

In compliance with technical submission guidelines:
- **Application AI Features**: The running application uses Groq LLMs (`Llama-3.3-70b` / `Llama-4-Scout`) via Google ADK and LiteLLM for unstructured lead extraction, conversational sales assistance in LeadPilot, and indicative market pricing estimates.
- **Deterministic Core**: Lead qualification scoring, task pipeline transitions, and metrics aggregation are strictly deterministic Python/SQL logic—not LLM hallucinations.
- **AI-Assisted Engineering**: AI coding assistance was utilized during development for rapid prototyping, test-driven validation, test suite creation, and visual token refinement. All business logic, scoring formulas, and database constraints were manually reviewed, verified, and audited against automated test suites.

---

## 19. Roadmap

Planned future enhancements:
- [ ] **WhatsApp & Email Webhooks**: Ingest inbound leads directly from Twilio/Meta WhatsApp Business APIs.
- [ ] **Empirical Conversion Tracking**: Train statistical machine learning models on closed-won sales outcomes to benchmark against deterministic scores.
- [ ] **RERA & MLS Integration**: Direct integration with government RERA registries and verified property listings for real-time market pricing.
- [ ] **Role-Based Access Control (RBAC)**: Support team hierarchies (Agent, Team Lead, Broker Director) with row-level data security.
- [ ] **Calendar Two-Way Sync**: Synchronize follow-up tasks directly with Google Calendar and Outlook.

---

## 20. License & Acknowledgments

### License
This project is prepared for technical portfolio evaluation. A formal open-source license (such as MIT or Apache 2.0) may be attached prior to public commercial distribution.

### Acknowledgments
- **Google DeepMind & Google ADK**: For the Agent Development Kit framework.
- **Groq Cloud**: For ultra-low-latency Llama inference.
- **FastAPI & Pydantic**: For world-class async Python web frameworks.
- **Design Inspiration**: Linear, Attio, Stripe Dashboard, and Notion for aesthetic and functional patterns.

---

*MasalNest — Find the lead. Make the move.*
