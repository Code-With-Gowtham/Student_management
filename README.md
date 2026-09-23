# Vertex Engineering College OS

This project is a full-stack academic operations platform for an engineering college.

## Features
- Admin, faculty, and student role support
- JWT-based authentication
- Engineering department, course, student, attendance, and marks management
- College dashboard and academic analytics view
- REST API for CRUD-like management actions
- React frontend UI for the college workspace and forms
- Admin removal of students and faculty with linked account cleanup
- Self-service password changes for every signed-in account

## Tech stack
- Frontend: React + Vite
- Backend: Python FastAPI
- Database: SQLite for local development
- Authentication: JWT + bcrypt

## Run backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Run frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

## Default login
- Username: admin
- Password: admin123

## Account onboarding

When an admin creates a student or faculty profile, the system creates a linked account.
The create confirmation displays the generated username and the temporary password:

```text
welcome123
```

The account owner should sign in, open the gear icon in the sidebar, and use **Change password**.

Only admins can remove students or faculty. Removing a student also removes their linked login,
attendance records, and marks.

## Notes
The backend uses SQLite for a quick local setup. The project architecture is ready for migration to MySQL in a production environment.
