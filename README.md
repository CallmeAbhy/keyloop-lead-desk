# Keyloop Technical Assessment — Scenario C: Sales Lead Management Tool

An enterprise-grade **Sales Lead & Quote Management Application** built for **Scenario C (Demand Domain)**. It satisfies all core Keyloop requirements (Lead Inbox, Lead Details View, and Persistent Chronological Activity Logging) while adding enterprise **Configure, Price, Quote (CPQ)** modules: a **Metadata-Driven Collapsible Form Engine**, **Form Master Schema Versioning**, **Webhook Duplicate Consolidation**, **Unassigned Lead Pool Claiming**, and a **Discount Approval Process (DAP)** guardrail.

---

## 🚀 How to Build, Run, and Test

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation & Local Development

```bash
npm install
npm run dev
```

Open the URL printed in your terminal (typically `http://localhost:5173`).

### Running the Automated Test Suite

```bash
npx vitest run
```

The test suite (`src/App.test.tsx`) validates:

1. **CPQ Pricing & Discount Calculation Engine** (MSRP + add-ons + percentage discount).
2. **Unassigned Lead Pool Claiming** (Assigning ownership to the active Sales Representative and recording an audit activity).
3. **Webhook Duplicate Inquiry Merging** (Appending a 2nd vehicle into `Product-Pricing` rather than spawning conflicting duplicate leads).
4. **Form Master Versioning** (Publishing new JSON metadata schemas without breaking archived versions).

---

## 3. Data Flow & Core Workflows

1. **Webhook Ingestion:** Website payloads hit `POST /webhooks/leads`. The backend checks active customer records and appends multi-vehicle inquiries to avoid duplicates.
2. **Pool Claiming:** Reps request unassigned leads; atomic conditional updates ensure only one rep successfully claims ownership.
3. **Consultation & DAP:** Reps update form values along the 5-junction Metro Line. Entering a discount >5% triggers Section 3 (DAP), requiring Sales Manager approval to unlock quote publishing.
4. **CAF Bundling:** Reps select specific accepted vehicle quotes from cross-shopping configurations to bundle into a single binding Master CAF.
5. **Form Master Studio:** Managers update schema fields/validations and publish new versions live to client workspaces.

---

## 4. Technology Stack & Observability

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS.
- **Backend API Design:** ASP.NET Core 8 Web API.
- **Database:** PostgreSQL with JSONB metadata storage.
- **Observability:** Centralized structured logging (Serilog) and OpenTelemetry metrics (`lead_response_time_seconds`, `dap_approval_latency_seconds`).

---

## 5. Future Expansion Roadmap

1. **Advanced Form Dependency Engine:** Complex cross-attribute validation expressions and conditional section matrices.
2. **Form Within Form (Sub-Forms):** Recursive component embedding for multi-tiered entities (e.g., Trade-In Appraisals).
3. **Custom Order Submission Profiles:** Tenant-specific checkout templates (Retail vs. Corporate Fleet).
4. **Customer EV Portal Dashboard:** Self-care portal for buyers to track quote approval status and build schedules.

---

## 6. GenAI Collaboration Narrative

- **Domain Translation:** AI helped map enterprise CPQ patterns (DAP approvals, versioned schemas) onto automotive retail Scenario C.
- **Edge-Case Stress Testing:** Used AI to model cross-shopping deduplication, concurrency race conditions, and rep fatigue constraints.
- **Verification:** Validated state-machine transitions and wrote Vitest business logic unit tests.
