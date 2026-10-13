---
doc: checklist
status: draft
---

# Build Checklist

Build mode: learn

## Slices

- [ ] **1. Customer chat answers use the real product catalogue**
  Becomes usable: A working customer chat shows a welcome screen, accepts a product question, and replies with real product details from the seeded data.
  Why now: This proves the unique kernel early: the app answers real customer questions using business data instead of a mock chat.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Features and Behavior > Customer Support Chat`
  Spec ref: `spec.md > Components > Customer Chat Interface`, `spec.md > Data Model`, `spec.md > File Structure`
  Build: Scaffold the frontend and backend, seed the business profile and product catalogue, connect the chat interface to the backend, and return grounded product answers.
  Verify (mechanical): Start the backend and frontend, submit the sample backpack question, and confirm the response contains the actual product name, price, features, and availability from the seeded data.
  Learner check: Open the app, ask about a product, and confirm the answer feels grounded in real catalogue data.
  Commit: `Add customer chat and product catalogue responses`

- [ ] **2. Complaints are created with unique IDs and persist across refreshes**
  Becomes usable: The customer can submit a complaint, receive confirmation, and see it recorded in persisted storage with a unique reference ID.
  Why now: Complaint capture is a core demo requirement and must be proven before the owner workflow is added.
  PRD ref: `prd.md > Features and Behavior > Complaint Submission`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components > Complaint Service`, `spec.md > Data Model`
  Build: Add complaint creation, unique reference generation, validation, persistence in PostgreSQL, and confirmation messaging that does not promise a resolution.
  Verify (mechanical): Submit a complaint, confirm the API returns a reference ID, then reload the page and make sure the complaint remains visible.
  Learner check: Submit a complaint, note the generated reference ID, refresh the page, and confirm it is still there.
  Commit: `Add persistent complaint capture`

- [ ] **3. Owner dashboard supports complaint review and status updates**
  Becomes usable: The owner dashboard lists complaints with details and allows status changes that persist after refresh.
  Why now: This closes the loop from customer report to business follow-up and proves the complete demo workflow.
  PRD ref: `prd.md > Features and Behavior > Business Dashboard`, `prd.md > The Core Journey`
  Spec ref: `spec.md > Components > Owner Dashboard`, `spec.md > Data Model`
  Build: Fetch complaints from the backend, display them in a dashboard, add status selection controls, and persist status updates.
  Verify (mechanical): Submit a complaint, open the owner dashboard, change the status from Open to In Progress to Resolved, refresh, and confirm the final state is retained.
  Learner check: Try the owner dashboard, update a complaint, refresh the page, and confirm the new status remains visible.
  Commit: `Add owner dashboard and status updates`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1, before slice 2
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions
