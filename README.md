# ReturnDesk

**Live Application:** https://returndesk-six.vercel.app/
**GitHub Repository:** https://github.com/tejaskhile/returndesk

## Overview

ReturnDesk is a return-request management application for an online store. It provides a workspace for support agents to create return requests, review customer and item details, track request status, record decisions, add notes, and manage requests throughout their lifecycle.

The application uses a Next.js frontend and server-side API routes, with PostgreSQL for persistent storage. Business rules are validated on the server so that invalid operations cannot be performed simply by bypassing the interface.

## Features

### Return Request Management

- Create return requests with customer contact information, order details, item information, quantity, and return reason.
- Generate a unique, human-readable reference for each request.
- View individual requests with their details, current status, resolution, and notes.
- Edit request details while the request remains in an editable state.
- Archive eligible requests without permanently deleting their database records.

### Search and Request Listing

- Search requests by customer name, order number, or reference.
- Filter requests by status and return reason.
- Sort results and navigate through paginated results.
- Perform search, filtering, sorting, and pagination on the server rather than loading the entire dataset into the browser.

### Workflow Management

Requests follow a defined lifecycle:

`Open → In Review → Approved → Completed`

Requests in `In Review` can also be rejected. `Rejected` and `Completed` are terminal statuses.

When approving a request, the agent must select a resolution:

- **Refund:** Requires a refund amount greater than zero.
- **Replacement:** Does not record a refund amount.
- **Store Credit:** Does not record a refund amount.

The interface presents actions according to the request's current state, and the server independently validates every transition.

### Notes and Archiving

- Display request notes in chronological order.
- Allow notes to be added throughout a request's lifecycle.
- Keep existing notes immutable after creation.
- Allow archiving only for requests in `Open` or `Rejected` status.
- Retain archived records in PostgreSQL while excluding them from the normal request list and individual request retrieval.

## Technology Stack

- **Frontend:** Next.js App Router, React
- **Language:** JavaScript
- **Styling:** Tailwind CSS
- **Backend:** Node.js through Next.js Route Handlers
- **Database:** PostgreSQL
- **Database hosting:** Neon
- **ORM:** Prisma
- **Validation:** Zod

## Getting Started

### Prerequisites

- Node.js and npm
- A PostgreSQL database
- Git

### 1. Clone the repository

```bash
git clone <GITHUB_REPOSITORY_URL>
cd returndesk
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root using `.env.example` as a reference.

Configure `DATABASE_URL` with a valid PostgreSQL connection string. The database must be accessible from the machine running the application.

### 4. Set up the database

Apply the existing Prisma migrations:

```bash
npx prisma migrate deploy
```

Generate the Prisma Client:

```bash
npx prisma generate
```

The migration history and schema are included in the repository so that the database can be created from an empty state.

### 5. Load sample data

```bash
npx prisma db seed
```

The seed script creates sample return requests across all supported statuses and return reasons, with notes attached to selected requests.

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

### 7. Build for production

```bash
npm run build
npm run start
```

## Environment Variables

The application uses the following environment variable:

| Variable       | Description                                 |
| -------------- | ------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |

See `.env.example` for the expected format. Actual database credentials are kept in the local `.env` file and are not committed to the repository.

## Data Model

The database consists primarily of two related models.

### ReturnRequest

Stores the return reference, customer details, order number, item SKU and name, quantity, return reason, workflow status, resolution, refund amount, timestamps, and archive timestamp.

The model uses enums for status, return reason, and resolution to restrict values to the supported options.

### Note

Stores the note content, creation timestamp, and associated request ID. Notes are linked to return requests through a database relationship and are retrieved chronologically.

### Database Integrity

- Unique request references.
- A database-level partial unique index prevents multiple live requests for the same order and item.
- Quantity and refund constraints protect against invalid values.
- Relationships and indexes support request retrieval and listing operations.

## Business Rules

The following rules are enforced by the server.

### 1. Status transitions

Only permitted transitions are accepted. A request cannot skip workflow stages, and a rejected or completed request cannot transition to another status.

### 2. Approval and resolution

Approval requires a resolution of Refund, Replacement, or Store Credit. Refunds require a positive amount, while non-refund resolutions must not store a refund amount.

### 3. One live request per order and item

A live request prevents another request from being created for the same order number and item SKU. Rejected and completed requests are considered closed, allowing a new request for the same combination.

### 4. Editing restrictions

Customer and item details cannot be edited after a request reaches Approved, Rejected, or Completed. The server rejects edits that violate these restrictions. Notes remain addable throughout the request lifecycle.

### 5. Archiving

Only Open and Rejected requests can be archived. Archiving marks the record as removed from the desk without deleting it from the database.

### Error handling

The API uses appropriate HTTP status codes and consistent JSON error responses for validation failures, missing resources, conflicts, and invalid workflow operations.

## API Overview

The API is implemented using Next.js Route Handlers.

| Method  | Endpoint                   | Purpose                                           |
| ------- | -------------------------- | ------------------------------------------------- |
| `GET`   | `/api/requests`            | List, search, filter, sort, and paginate requests |
| `POST`  | `/api/requests`            | Create a return request                           |
| `GET`   | `/api/requests/[id]`       | Retrieve request details and notes                |
| `PUT`   | `/api/requests/[id]`       | Update editable request details                   |
| `PATCH` | `/api/requests/[id]`       | Perform a workflow transition                     |
| `POST`  | `/api/requests/[id]/notes` | Add a note                                        |
| `GET`   | `/api/requests/removed`    | List archived requests                            |

Request validation is handled with Zod, and database operations are performed through Prisma.

## Design Decisions

### PostgreSQL and Prisma

PostgreSQL provides persistent relational storage for requests and notes. Prisma provides a structured database access layer, schema definitions, migrations, and consistent queries from the server.

### Server-side listing operations

Search, filtering, sorting, and pagination are applied in database queries. This avoids fetching the entire request dataset for client-side processing and allows the listing operations to work together.

### Database constraints for duplicate requests

The live-request rule is enforced using a partial unique index on the order number and item SKU for requests that have not been rejected or completed. This adds protection at the database level, including when concurrent requests attempt to create the same live request.

### Conditional workflow updates

Workflow changes check the current status before updating a request. This helps prevent an operation based on stale request state from applying an invalid transition.

### Soft archiving

Archived requests receive an archive timestamp instead of being deleted. This preserves the historical record while keeping archived requests out of normal desk operations.

### Separate notes

Notes are stored separately from the main request and associated through a relationship. This preserves the note history and allows new notes to be added without modifying previously written notes.

### Server-side validation

Validation and business rules are implemented on the server rather than relying solely on disabled buttons or frontend checks. This ensures API requests are subject to the same restrictions as actions performed through the interface.

## Assumptions

- A request is identified by its unique system-generated reference.
- An order and item combination is considered live until its request reaches Rejected or Completed.
- Approved, Rejected, and Completed requests have locked customer and item details.
- Archiving removes a request from the active desk without permanently deleting its record.
- Notes are append-only records and remain available throughout the request lifecycle, including after a request has been decided.

## Seed Data

The seed script is located at `prisma/seed.cjs`.

It creates 35 sample requests distributed across all five statuses and all five return reasons. Selected requests include notes, and sample archived requests are included to support testing of the removed-request view.

Run the seed script with:

npx prisma db seed

The seed uses deterministic references and upserts so repeated runs do not create duplicate seed requests. Existing notes are checked before sample notes are inserted.

## Deployment

**Live Application**: https://returndesk-six.vercel.app/

## Time Spent

~10 hours
