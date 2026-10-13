---
doc: spec
status: draft
---

# SmartCare AI — Technical Spec

## How This Works, In Plain Language

SmartCare AI will be a small web app with two main experiences: a customer-facing chat and a business-owner dashboard. The customer can ask about products and get answers based on a sample product catalogue and business information. The same flow can also surface a recommendation based on the customer’s needs, and a complaint can be recorded and tracked.

The app uses a React frontend for the user interface, an Express.js backend for the business logic and API routes, and PostgreSQL for persistent storage. The product catalogue and complaint records live in the database so the app can load them reliably when the page refreshes. This keeps the product realistic for a demo while staying small enough to build in a hackathon timeframe.

The design decision here is to keep the product as a single-business proof of concept. The business has one sample catalogue, one set of support flows, and one dashboard. That lets us demonstrate the whole customer journey without adding the complexity of multi-user accounts, billing, or production integrations.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

1. The customer opens the frontend app and sees the business header, welcome text, suggested prompts, and chat input.
2. The customer sends a product question. The frontend sends that message to the Express API.
3. The API checks the product catalogue in PostgreSQL and builds a response using actual product names, prices, features, and availability.
4. The customer describes their needs, and the API ranks or filters the product catalogue to suggest the best product match.
5. The customer submits a complaint. The API creates a complaint record with a unique ID, an Open status, the customer details if provided, and the complaint date.
6. The owner opens the dashboard. The frontend fetches complaint data from the API and shows a list of complaints with reference ID, date, description, and status.
7. The owner changes the complaint state to In Progress or Resolved. The API updates the record in PostgreSQL, and the dashboard reloads the new status.
8. Refreshing the page or returning later still shows the latest record because the data is persisted in the database.

## Stack

- Frontend: React with Vite
  - Rationale: React matches the learner’s experience and makes a clean, mobile-friendly chat + dashboard interface easy to build quickly.
  - Tradeoff: It adds a frontend project, but it keeps the UI fast and maintainable for the demo.

- Backend: Node.js with Express.js
  - Rationale: This fits the learner’s existing experience and keeps the API simple for chat, product queries, and complaint CRUD operations.
  - Tradeoff: A single Express service is enough for this MVP; we are not adding a separate service layer or queue.

- Database: PostgreSQL
  - Rationale: PostgreSQL is a strong fit for persistent complaint records and a simple product catalogue, and it matches the learner’s stack.
  - Tradeoff: It adds local database setup, but it gives a reliable proof-of-concept data layer that matches the product requirements.

- Dev tooling:
  - Vite for the frontend dev server
  - npm scripts for running the frontend and backend
  - Docker Compose for local PostgreSQL startup

Document links:
- React: https://react.dev/
- Vite: https://vite.dev/
- Express: https://expressjs.com/
- PostgreSQL: https://www.postgresql.org/
- Docker: https://www.docker.com/

## Where It Runs and How Someone Tries It

This project runs locally on the learner’s machine for the demo. There is no required live deployment for the hackathon. The short demo video and public GitHub repository are the required deliverables; deployment is optional.

Local run flow:
1. Start PostgreSQL with Docker Compose.
2. Run the Express API server.
3. Run the React frontend development server.
4. Open the local frontend in the browser.
5. Use the chat flow to ask a product question, then go through the recommendation and complaint workflow.
6. Open the owner dashboard to review and update the complaint status.

Expected commands:
- Frontend: npm install, then npm run dev
- Backend: npm install, then npm run dev
- Database: docker compose up -d

The app should be open in a browser on localhost, and the demo should be easy to record in about two minutes.

## Look and Feel

The app should feel clean, professional, and trustworthy. The customer chat should feel approachable and mobile-friendly, with clear spacing and readable text. The owner dashboard should feel operational and organized, with strong status visibility and low visual clutter.

The design direction is:
- Clean white and neutral backgrounds with a small accent color for key actions
- Simple, readable typography with high contrast
- Clear separation between customer and business-owner experiences
- Strong status color cues for Open, In Progress, and Resolved
- Minimal decorative styling; the product should look like a serious business dashboard rather than a toy app

## Components

### Customer Chat Interface
What it does: displays the business name, welcome message, suggestions, chat thread, and text input.
PRD ref: `prd.md > Customer Support Chat`, `prd.md > Screens and Layout`.

It talks to:
- the chat API for customer questions
- the product recommendation logic for customer need-based recommendations
- the complaint API for complaint submission

### Recommendation Engine
What it does: filters and ranks the product catalogue according to the customer’s stated preferences such as durability, use case, and budget.
PRD ref: `prd.md > Product Recommendations`.

It talks to:
- the product catalogue in PostgreSQL
- the chat interface for presenting the recommendation output

### Complaint Service
What it does: creates complaint records with metadata, reference IDs, statuses, and timestamps.
PRD ref: `prd.md > Complaint Submission`, `prd.md > Business Dashboard`.

It talks to:
- the complaint table in PostgreSQL
- the customer chat for confirmation output
- the owner dashboard for display and status updates

### Owner Dashboard
What it does: shows recent enquiries and complaints, lets the owner select a complaint, and allows status changes.
PRD ref: `prd.md > Business Dashboard`.

It talks to:
- the complaint API
- the frontend state for local dashboard updates

### Data Seeder
What it does: loads realistic sample business information and a small product catalogue so the demo is dependable and grounded in real data.
PRD ref: `prd.md > What We're Building`.

It talks to:
- PostgreSQL at startup or database initialization time

## Data Model

The app will use a small but realistic schema.

### Business Profile
- id
- name
- description
- contact_email or phone if needed for the demo
- created_at

Purpose: stores the demonstration business details shown in the chat interface.

### Product
- id
- name
- category
- price
- description
- features
- availability
- created_at

Purpose: drives product questions and recommendations using real catalogue entries.

### Complaint
- id
- reference_id
- customer_name
- customer_contact
- description
- status
- created_at
- updated_at

Purpose: stores customer complaints, preserves them across refreshes, and supports dashboard updates.

Status values:
- Open
- In Progress
- Resolved

The reference_id should be generated as a unique identifier when a complaint is created. This value is displayed in the dashboard and must remain attached to the complaint as the status changes.

## File Structure

```text
project/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatView.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ComplaintDetail.jsx
│   │   │   └── ProductCard.jsx
│   │   ├── pages/
│   │   │   ├── CustomerPage.jsx
│   │   │   └── OwnerPage.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── sampleData.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── chat.js
│   │   │   ├── products.js
│   │   │   └── complaints.js
│   │   ├── controllers/
│   │   │   ├── chatController.js
│   │   │   ├── productController.js
│   │   │   └── complaintController.js
│   │   ├── services/
│   │   │   ├── recommendationService.js
│   │   │   └── complaintService.js
│   │   ├── db/
│   │   │   ├── connection.js
│   │   │   └── init.sql
│   │   ├── app.js
│   │   └── server.js
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
├── README.md
├── devpost/
│   ├── learner-profile.md
│   ├── scope.md
│   ├── prd.md
│   └── spec.md
└── .gitignore
```

## External Services and Dependencies

- PostgreSQL database
  - Purpose: persistent storage for catalogue and complaint data
  - Connection: local database service or Docker container
  - Required config: host, port, username, password, database name
  - Documentation: https://www.postgresql.org/docs/

- No third-party AI service is required for the first version.
  - Rationale: the demo must be reliable and deterministic without API keys, rate limits, or external dependencies.
  - The product answers and recommendations are driven by seeded product data and business metadata stored locally.

- Optional deployment target later: Azure Static Web App or Azure App Service, but not required for the MVP.
  - This will be evaluated only after the local, working demo is proven.

## Important Failure Modes

- **No product match in the catalogue** → The chat returns a truthful no-match message and asks the customer to revise the query instead of hallucinating a product.
- **Complaint description missing** → The form displays a validation error and prevents the complaint from being saved.
- **Database not running** → The backend returns a clear error and the app displays a friendly fallback message rather than silently failing.
- **Status update fails** → The dashboard shows the prior state until the save succeeds, and the user sees the failure message clearly.

## What Was Simplified and Why

- **Single-business demo instead of multi-tenant accounts** — This keeps the product focused on the core workflow and avoids unnecessary authentication and business management complexity.
- **Static sample data instead of live commerce or real inventory** — The demo needs to be reliable and grounded in real data, not dependent on API integrations or real payment systems.
- **Local database instead of hosted infrastructure** — A single Postgres instance is enough to prove persistence and status updates without extra deployment complexity.
- **No real AI API dependency in v1** — The chatbot behavior is grounded in local catalogue data and business information, which is easier to control and more reliable in a short demo.

## Decisions and Open Issues

Decisions made:
- React frontend + Express backend + PostgreSQL database for a small but realistic full-stack app
- One demonstration business and one catalogue dataset
- Persistent complaint storage for refresh-safe status updates
- No production authentication, payment, or multi-business features in the MVP

One genuine uncertainty or ambiguity discussed:
- No major blocker was identified. The architecture aligns directly with the learner’s current stack and business goal, and it keeps the app focused on a demonstrable end-to-end workflow.

Open issues carried forward from the PRD:
- None critical; the product requirements are sufficiently specific to proceed to build planning.
