# Injibara University Campus Problem Reporting System

A web-based system for reporting, tracking, and managing problems on the Injibara University campus.

Students and other authorized users can use the system to report campus problems such as water supply interruptions, electricity problems, damaged toilets, and other campus facilities or services issues.

## Project Objectives

- Provide a centralized platform for reporting campus problems.
- Help responsible departments receive and manage complaints.
- Allow users to track complaint progress.
- Maintain complaint status history and comments.
- Improve communication and accountability between campus users and responsible staff.

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Node.js
- Express.js
- Prisma ORM
- JWT authentication

### Database
- PostgreSQL

## Main Features

- User authentication and authorization
- Role-based access for different user types
- Complaint creation and management
- Complaint categories
- Campus departments and locations
- Complaint comments
- Complaint status history
- Student confirmation and reopening of resolved complaints
- In-app notifications for status changes
- AI-assisted complaint categorization and urgency detection
- Map-based complaint location picker
- File attachments (photos and PDFs)
- Database-backed data management

## User Roles

The project database supports the following roles:

- **STUDENT:** Reports problems, tracks progress, confirms a resolved complaint as fixed, or reopens it with a reason when the problem is not actually solved.
- **STAFF:** Supports campus complaint management; reviews, assigns, and updates complaint status.
- **DEPARTMENT_OFFICER:** Manages complaints assigned to their department; works on and resolves complaints.
- **ADMINISTRATOR:** Has administrative access according to the application's authorization rules.

Available actions depend on the permissions implemented in the backend.

## Project Structure

```text
injibara-campus-reporting/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.js
│   ├── .env
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # SVG icon set and shared UI pieces
│   │   ├── pages/        # AuthPage, DashboardPage, ComplaintsPage
│   │   ├── App.jsx
│   │   └── AppContext.jsx
│   ├── .env.example
│   └── package.json
└── README.md
```

The exact files may change as development continues.

## Requirements

Install the following software before running the project:

- Node.js and npm
- PostgreSQL
- Git
- Visual Studio Code (recommended)

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/enu-style/Campus-Problem-Reporting-System.git
cd Campus-Problem-Reporting-System
```

If you already have the project on your computer, open its existing folder instead.

### 2. Configure PostgreSQL

Start PostgreSQL and create a database named:

```text
injibara_campus_reporting
```

Make sure your PostgreSQL username, password, host, port, and database name match your local configuration.

### 3. Configure the backend environment

Open the `backend` directory and create or update its `.env` file using the variable names required by the backend configuration.

At minimum, configure the database connection variable:

```text
DATABASE_URL
```

The database connection URL must match your local PostgreSQL configuration. Configure any other required backend variables, such as the port and JWT secret, according to the backend's environment configuration.

**Security:** Never commit `.env` files, database passwords, JWT secrets, or other credentials to GitHub.

### 4. Install backend dependencies

From the project root, run:

```bash
cd backend
npm install
```

### 5. Apply database migrations and generate Prisma Client

```bash
npx prisma migrate deploy
npm run build
```

For a local development database where you are creating a new migration, use the project's existing Prisma configuration and migration workflow. Do not create a new migration unnecessarily if the existing migrations already describe your schema.

### 6. Start the backend

For development:

```bash
npm run dev
```

The API is configured to run on port `5000` in the current local setup.

Check the health endpoint in another terminal:

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "Injibara University Campus Reporting API is running"
}
```

### 7. Configure and start the frontend

Open a second terminal:

```bash
cd ~/injibara-campus-reporting/frontend
npm install
```

Create the frontend `.env` file from `.env.example` if needed. For local development, configure:

```text
VITE_API_URL=http://localhost:5000
```

Then start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite in your browser, usually:

```text
http://localhost:5173
```

## Backend API Modules

The backend source includes route modules for:

- Authentication
- Complaints (including student confirm and reopen endpoints)
- Complaint comments
- Categories
- Departments
- Locations
- Users
- Notifications

Check `backend/src/server.js` and the files in `backend/src/routes/` for the exact registered URL paths and supported HTTP methods.

Protected endpoints require a valid access token in the request's `Authorization` header when authentication middleware is applied:

```text
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Do not use a real password or token in screenshots, public documentation, or GitHub commits.

## Testing and Production Builds

### Backend

```bash
cd backend
npm run build
```

### Frontend

```bash
cd frontend
npm run build
```

A successful frontend build creates production assets in the `frontend/dist/` directory.

Before deployment, test authentication, role permissions, complaint creation, complaint visibility, status changes, comments, and database persistence.

## Complaint Lifecycle

A complaint moves through the following statuses:

```text
PENDING → REVIEWED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
```

At any stage before completion a complaint may be `REJECTED` by staff. If a
student is not satisfied with a resolved complaint, they can confirm it as
`CLOSED` or reopen it with a reason, which returns it to the responsible
department.

Each transition is validated on the backend against both the allowed status
flow and the role of the user performing the change, and every change is
recorded in the complaint's status history with an optional note.

## Development Status

This project is under active development. Features, routes, database models, and setup instructions may be updated as implementation progresses.

## Future Improvements

- Add comprehensive automated tests
- Configure secure production deployment
- Improve validation, logging, and error handling
- Add email/SMS notifications for reopened complaints

## Author and Institution

**Project:** Injibara University Campus Problem Reporting System  
**Institution:** Injibara University  
**Purpose:** Academic software development project

## License

No open-source license has been specified yet. Contact the project owner before redistributing or reusing this project.
