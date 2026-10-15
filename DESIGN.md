# MasalNest — Design System & Frontend Architecture

## 1. Design Philosophy

MasalNest is an AI-powered real estate intelligence platform built specifically for Indian real estate sales teams. Its user interface is designed following the principles of modern, high-craft B2B SaaS platforms: **Linear, Attio, Stripe Dashboard, and Notion**.

### Core Tenets
1. **Calm, Information-Dense, White-First Surfaces**: No full-screen background photo distraction on sales workspaces, no neon glows, and no dark mode ambiguity. The workspace defaults to pure white (`#ffffff`) surfaces, an off-white canvas (`#f8fafc`), and crisp 1px borders (`#e2e8f0`).
2. **Restrained Single Primary Accent**: High-frequency tools must avoid visual fatigue. MasalNest uses a single, focused royal blue accent (`#2563eb`) for primary actions and active navigation states.
3. **Semantic Status Indicators**: Priority levels (Hot, Warm, Cold, Unscored, Stale) and task urgency (Overdue, Due Today, Upcoming, Completed) use muted, high-contrast tints with status dots rather than glaring full-bleed colors.
4. **Data Integrity & Tabular Numerals**: Every monetary quantity (₹ Indian Rupees in Lakhs and Crores), numeric priority score (0–100), and date uses `font-variant-numeric: tabular-nums` to ensure exact column alignment and zero jitter during live re-calculation.
5. **Dual Presentation (Cards & Dense Table View)**: Real estate agents can switch seamlessly between an informative Card Grid view (with inline "Why this score?" factor expanders) and a high-density Linear/Attio-style CRM Data Table view.

---

## 2. Token System (`tokens.css`)

The token system is defined in `frontend/src/styles/tokens.css` and strictly referenced across all components.

### 2.1 Color Ramp (Slate Neutral)
- `--color-page`: `#f8fafc` (Slate 50 — calm workspace backdrop)
- `--color-surface`: `#ffffff` (Pure white — cards, tables, modals)
- `--color-surface-subtle`: `#f1f5f9` (Slate 100 — table headers, collapsible containers)
- `--color-surface-hover`: `#f8fafc` (Slate 50 — row and card hovers)
- `--color-border`: `#e2e8f0` (Slate 200 — standard 1px structural dividing borders)
- `--color-border-strong`: `#cbd5e1` (Slate 300 — input hover and active borders)

### 2.2 Text Hierarchy
- `--color-text-primary`: `#0f172a` (Slate 900 — high-contrast headlines and values)
- `--color-text-secondary`: `#475569` (Slate 600 — field labels, subtitles, metadata)
- `--color-text-muted`: `#64748b` (Slate 500 — timestamps, unit indicators, footnotes)
- `--color-text-disabled`: `#94a3b8` (Slate 400 — disabled states)

### 2.3 Accent & Semantic Tokens
- **Brand Accent**: `--color-brand: #2563eb` (Blue 600), `--color-brand-hover: #1d4ed8`
- **Hot Priority (Score ≥ 70)**: 
  - Background: `#fff1f2` (Rose 50)
  - Text: `#be123c` (Rose 700)
  - Border: `#fecdd3` (Rose 200)
- **Warm Priority (Score 40–69)**:
  - Background: `#fffbeb` (Amber 50)
  - Text: `#b45309` (Amber 700)
  - Border: `#fde68a` (Amber 200)
- **Cold Priority (Score < 40)**:
  - Background: `#f0fdf4` (Emerald 50)
  - Text: `#15803d` (Emerald 700)
  - Border: `#bbf7d0` (Emerald 200)
- **Stale Analysis Flag**:
  - Background: `#fef3c7` (Amber 100)
  - Text: `#92400e` (Amber 800)
  - Border: `#fcd34d` (Amber 300)
- **Overdue Task Accent**:
  - Left border: `3px solid #dc2626` (Red 600)
  - Text & icon: `#dc2626`

### 2.4 Elevation & Shadows
- `--shadow-xs`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)` (Standard card and input shadow)
- `--shadow-sm`: `0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px -1px rgba(0, 0, 0, 0.04)` (Card hover)
- `--shadow-md`: `0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)` (Dropdowns)
- `--shadow-lg`: `0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)` (Modals & Drawers)

---

## 3. Key Components & Architecture

### 3.1 Top Navigation (`Navbar.jsx`)
- Fixed top navigation with crisp border (`1px solid var(--color-border)`).
- Distinct MasalNest brand icon and typography.
- Restrained LeadPilot badge (`AI Real Estate Intelligence`).
- Pill-segmented navigation between **Leads**, **Tasks**, and **Market Insights**.
- Primary CTA: `+ New Lead` (triggers inbound lead creation modal).

### 3.2 Metrics Dashboard (`DashboardMetrics.jsx`)
- 8 compact, information-dense metric cards:
  - Total Leads (with active filter badge)
  - Hot Leads (Score ≥ 70)
  - Warm Leads (Score 40–69)
  - Cold / Unscored
  - Pending Tasks
  - Due Today
  - Overdue Tasks
  - Completed Tasks
- Interactive filter toggles linked directly to lead priority criteria.

### 3.3 Leads Pipeline (`LeadCard.jsx` & CRM Table View)
- **View Toggle**: Real estate agents can switch between **Cards** and **Table** views with a single click.
- **Card View**:
  - Customer name, status badge, locality, property type requirement.
  - Tabular Indian currency (`₹3.5 - 4.5 Cr`, `₹1.5 L`).
  - Purchase timeline pill (`Within 30 days`).
  - "Why this score?" collapsible drawer displaying all factor contributions.
  - Action footer with `Re-analyze` / `Score`, `LeadPilot Chat`, and `Details`.
- **Dense Table View**:
  - High-density table (`.crm-table`) matching Linear/Attio workflows.
  - Monospaced customer phone numbers, formatted Indian currency, and tabular timestamps.
  - Quick action buttons (Score, LeadPilot, View Details).

### 3.4 Lead Detail Modal (`LeadDetailModal.jsx`)
- Clean white backdrop modal displaying complete CRM record.
- **Deterministic Scoring v3.0 Reconciliation**:
  - Clear mathematical verification (`Total: XX/100 pts`).
  - 5 explicit categories:
    1. Purchase Timeline Urgency (max 25 pts)
    2. Budget Specification & Realism (max 25 pts)
    3. Requirement & Location Clarity (max 20 pts)
    4. Readiness & Pre-Approval (max 20 pts)
    5. Contact Completeness & Discoverability (max 10 pts)
  - Missing Qualification Checklist highlighting specific missing discovery fields.
  - Rule-based scoring banner clarifying deterministic vs generative analysis.
- Quick action buttons: `Prepare for Call`, `Log Interaction`, `LeadPilot Chat`.

### 3.5 Follow-up Task Pipeline (`App.jsx` Tab 2)
- Strict 4-stage urgency ordering:
  1. **Overdue**: Incomplete tasks whose due date has passed (red left accent).
  2. **Due Today**: Incomplete tasks scheduled for current date (amber left accent).
  3. **Upcoming**: Future incomplete tasks ordered nearest due date first (blue/slate left accent).
  4. **Completed**: Finished tasks housed in a collapsible bottom section (gray strikethrough).
- Re-scheduling shortcut: `+1 Day` single-click adjustment.

### 3.6 LeadPilot Assistant Drawer (`ChatDrawer.jsx`)
- Clean 440px slide-over drawer anchored to the right.
- Conversational chat bubbles (user: royal blue, LeadPilot: light slate surface).
- Quick action prompt chips (`Suggest next action`, `Draft follow-up email`, `Schedule visit`, `Analyze timeline`).
- Automatic task mutation triggers upon scheduling commitments.

### 3.7 Market Insights (`MarketInsights.jsx`)
- Clean white surface card for locality-based property pricing inquiries.
- Mandatory legal disclaimer: *"AI-generated indicative property price estimates · Not verified appraisal data"*.
- Tabular numeral display for indicative price per sq ft and estimate ranges.

---

## 4. Verification & Quality Assurance

- **Vitest Unit & Integration Suite**: 47/47 tests passing (Lead creation, score explanations, task pipeline date boundaries, duplicate submission protection, and failure handling).
- **Backend Pytest Suite**: 83/83 tests passing (Deterministic scoring v3.0, Groq LLM integration, tasks API, lead ingestion).
- **Vite Production Bundle**: Builds cleanly in < 800ms (`npm run build`).
- **Responsive Testing**: Verified across 1280px desktop, 768px tablet, and 375px mobile viewports using automated headless browser recording.
