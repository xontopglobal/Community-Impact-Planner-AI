---
doc: prd
status: approved
---

# SmartCare AI — Product Requirements

AI-powered customer support for a single small business, designed to answer customer questions from a sample business catalogue, recommend products, record complaints, and give the owner a simple dashboard to review and manage follow-up.
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`, and `scope.md > The POC Boundary`.

## The Core Journey

1. A customer opens the SmartCare AI customer chat and sees the business name, a welcome message, suggested questions, and a chat input.
2. The customer asks a question about a product, such as the price, availability, or key features of an item in the business catalogue.
3. The assistant uses the sample business data and product catalogue to provide a grounded answer, including product names, pricing, features, and stock status taken from the sample data.
4. The customer describes their needs and asks for a recommendation. The assistant recommends one or more products from the catalogue and explains why they fit the request.
5. The customer submits a complaint, such as a damaged item or service issue. The system records the complaint for the owner without claiming a refund, replacement, or resolution has been approved.
6. The owner opens the dashboard, reviews the submitted complaint and other recent enquiries, and updates the complaint status from Open to In Progress to Resolved.
7. The complete proof of success is that the complaint and enquiry appear in the dashboard with a reference ID and are still visible after a refresh or revisiting the page.

## Screens and Layout

### Customer Chat Screen
- Top banner or header with the business name and a simple brand label
- Welcome message introducing the assistant
- Suggested questions below the welcome message to guide a demo
- Chat thread area where the customer sees both their message and the assistant response
- Input field for typing questions or complaints
- Clear distinction between a normal support enquiry and a complaint submission flow

### Business Dashboard Screen
- Basic owner dashboard with a summary of enquiries and complaints
- Complaint list showing reference ID, description, date, and current status
- Complaint detail panel or selected item view
- Status controls allowing the owner to update the complaint state
- Refresh-safe data persistence so updates remain visible after leaving and returning

## Look and Feel

The product should feel professional, clean, and trustworthy. The customer-facing side should feel approachable and easy to use on mobile, while the owner dashboard should feel organized and operational. The visual design should avoid anything overly playful or low-trust. The interface should be mobile-friendly, readable, and fast to use in a short demo.

## Features and Behavior

### Customer Support Chat
- The customer can enter a natural-language question in the chat box.
- The system responds using the business profile and product catalogue sample data.
- Product answers include the actual product name, price, feature summary, and availability status from the sample catalogue.
- If no relevant product exists, the system responds honestly and recommends the customer ask a different question or contact the business directly.
- The assistant must avoid inventing product information or claiming availability that is not in the data.

Acceptance criteria:
- When the customer asks, “Which product would you recommend for someone looking for a durable school backpack, and how much does it cost?”, the assistant replies with one or more products drawn from the sample catalogue and includes the actual product name, price, and availability status from the stored data.
- The assistant never invents a price, stock status, or feature that is not present in the sample catalogue.
- A product inquiry that does not match a catalogue item receives a truthful no-match response rather than a guessed answer.

### Product Recommendations
- The customer can describe their needs, such as budget, durability, or use case.
- The assistant recommends a suitable product from the sample catalog and explains the reason it matches the requirement.
- Recommendations must reflect the real product catalogue and pricing.
- The assistant may provide one or more product suggestions, but the recommendation must remain grounded in actual product data.

Acceptance criteria:
- When the customer describes a need such as a durable backpack within a budget, the assistant recommends a catalogue item that matches the request and explains the fit in plain language.
- If multiple products qualify, the assistant can present the most relevant options and clearly state why each fits the described need.
- A recommendation cannot cite a product or price that is not in the sample catalogue.

### Complaint Submission
- The customer can submit a complaint through the chat interaction.
- The complaint input captures customer name or contact information if provided, complaint description, date, and the initial status of Open.
- The complaint is assigned a unique reference ID before it is saved.
- The complaint is stored in persistent storage so it remains available after refresh or navigation.
- The customer receives confirmation that the complaint was recorded.
- The system does not claim that the issue has been resolved, refunded, or replaced unless that status is later updated by the business owner.

Acceptance criteria:
- When the customer submits a complaint, the system creates a unique complaint reference ID that is visible in the owner dashboard and remains associated with that complaint.
- The complaint record includes at least the complaint description, date, initial status of Open, and customer contact field if provided.
- A submission confirmation tells the customer the complaint was recorded and does not promise a resolution, refund, or replacement.
- If the complaint form is empty or the description is missing, the user receives a clear validation message and the complaint is not saved.

### Business Dashboard
- The owner can view a list of support enquiries and complaints.
- Each complaint includes its reference ID, description, submission date, and current status.
- The owner can click a complaint to view its details.
- The owner can update the complaint status from Open to In Progress and then to Resolved.
- Updated status persists and remains visible after refresh.

Acceptance criteria:
- The owner dashboard lists all recorded complaints with a reference ID, description, date, and current status.
- When the owner selects a complaint, the detail view displays the complete complaint information and allows the status to be changed.
- Updating a complaint from Open to In Progress and then to Resolved persists after the page is refreshed or revisited.
- The owner dashboard shows the latest status without needing to re-enter the complaint.

## States and Boundaries

- **Initial customer visit** — The customer sees the welcome screen and sample suggested questions.
- **Product enquiry state** — The customer asks a question and receives a catalogue-grounded answer.
- **Recommendation state** — The customer provides preferences and receives a product suggestion with a reason.
- **Complaint recording state** — The customer submits a complaint and gets a “recorded” confirmation.
- **Dashboard view state** — The owner sees new complaints with their details and status.
- **Status update state** — The owner updates complaint status and saves it.
- **Persistence state** — Submitted complaints remain available when the page is refreshed or revisited.
- **Error or no-match state** — If a customer asks for a product that is not in the catalogue, the assistant responds honestly without fabricating information.
- **Validation state** — A complaint submission with no description or other required detail is rejected with a clear message and is not saved.

## Error and Edge States

- **No catalogue match** — The assistant states that the requested product or answer is not in the available sample data and asks the customer to refine the question or ask about another item.
- **Empty complaint description** — The form shows an error message and blocks the submission until the customer provides the required complaint details.
- **Missing customer details** — The form allows the complaint to be saved without contact info if the customer does not provide it, as long as the complaint description is present.
- **Status transition** — The owner can move the complaint through Open, In Progress, and Resolved; the current state is the one displayed in the dashboard after save.
- **Refresh after update** — After the owner changes the complaint status, reopening or refreshing the dashboard must still show the updated value.

## Product Decisions

- Single-business demo only — To keep the product focused and reliable for the hackathon, the MVP will support one demonstration business and a static sample catalogue.
- Persistent complaint storage — The project will store complaints in a way that survives refresh so the demo clearly proves the workflow works.
- No fake resolution claims — The product will never say a refund, replacement, or resolution is approved without owner action.
- Dashboard-first follow-up — The business owner’s dashboard is a core part of the proof of success, not a secondary screen.

## What We're Building

The proof of concept must include:
- A customer chat interface with suggested prompts and a working conversation flow
- Product answers grounded in sample data
- At least one product recommendation flow based on customer needs
- Complaint submission with persistent storage and Open status
- An owner dashboard to view and manage complaints
- Complaint status updates that persist across refreshes
- A demonstration business and realistic sample catalogue that works without real account data

## Deferred From the POC

- Real business authentication or account management
- Payment or order processing
- Real customer support integrations such as WhatsApp or email
- Multi-business tenant support
- Advanced analytics and reporting
- Automated AI escalation workflows beyond the basic complaint capture

## Possible Later Enhancements

- Integration with messaging platforms for customer support
- Multiple business accounts with separate catalogues
- Analytics dashboard for support trends and complaint patterns
- Sales suggestions and automated follow-up reminders

## Non-Goals

- Real-world payment handling
- Inventory or fulfilment systems
- Full CRM functionality
- Customer login accounts
- Large-scale support automation beyond the demo scenario

## Open Questions

- None blocking the hackathon build. The product scope is sufficiently defined to proceed to technical planning.
