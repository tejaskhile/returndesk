# ReturnDesk

ReturnDesk is a return-request management application for support teams. It lets users create and track return requests, search and filter requests, manage workflow transitions, add notes, edit eligible requests, and archive eligible records.

## Features

- Create return requests with customer, order, item, quantity, and reason details.
- Generate unique, human-readable return references.
- Search, filter, sort, and paginate requests on the server.
- View request details and chronological notes.
- Add notes throughout a request's lifecycle.
- Enforce valid status transitions and approval resolution rules.
- Edit requests only while their status allows it.
- Archive eligible requests without permanently deleting their records.
- Persist requests and notes in PostgreSQL.
- Seed the database with sample requests for development and testing.
- Provide responsive views for desktop and mobile screens.

## Technology Stack

- Next.js App Router and React
- JavaScript
- Tailwind CSS
- PostgreSQL hosted on Neon
- Prisma ORM
- Zod for request validation

## Prerequisites

- Node.js and npm
- A PostgreSQL database, such as Neon
- Git

## Local Setup

1. Clone the repository and enter the project directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local `.env` file using `.env.example` as a reference.
4. Configure the database connection variables required by `prisma.config.ts`.
5. Apply database migrations:

   ```bash
   npx prisma migrate deploy
   ```

6. Generate the Prisma Client if required by the project setup:

   ```bash
   npx prisma generate
   ```

7. Seed sample data:

   ```bash
   npx prisma db seed
   ```

8. Start the development server:

   ```bash
   npm run dev
   ```

9. Open [http://localhost:3000](http://localhost:3000).

## Database

PostgreSQL stores return requests and their notes. Prisma manages the schema and database access. Database migrations define the persistent schema and its constraints.

Do not commit real database credentials. Use environment variables for local development and deployment.

## Business Rules

- A live request is limited to one per order and item combination.
- Rejected and completed requests are terminal.
- Approval requires a resolution.
- Refund resolutions require a positive refund amount; other resolutions must not include a refund amount.
- Details can only be edited in permitted workflow states.
- Notes are retained as separate records and are not edited as part of request updates.
- Archiving removes eligible requests from the normal list without deleting their database records.

## Seed Data

The seed script creates sample requests across the supported statuses and reasons, with notes for selected requests. It is intended to be repeatable without creating duplicate seed references.

Run it with:

```bash
npx prisma db seed
```

## Environment Variables

See `.env.example` for the required environment variable names and placeholder formats. Never commit `.env` or production credentials.

## Testing and Verification

Verify the following before submission:

- Request creation and input validation
- Duplicate live-request prevention
- Search, filtering, sorting, and pagination
- Valid and invalid workflow transitions
- Approval resolution and refund amount validation
- Request editing restrictions
- Note creation and chronological display
- Archive restrictions and removed-request visibility
- Seed repeatability
- Production build

## Deployment

Deployment URL: To be added.

The deployed application requires the appropriate database environment variables and an accessible PostgreSQL database. Apply migrations before using the application.

## Known Limitations

Document any incomplete requirements, known bugs, or deployment limitations here before submission.

## Time Spent

To be filled in with the actual time spent on the assignment.
