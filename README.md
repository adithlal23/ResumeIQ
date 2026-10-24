# ResumeIQ — AI Resume Analyzer

ResumeIQ is an AI-powered resume analysis project that helps job seekers compare their resumes with job descriptions, identify skill gaps, and receive recommendations for improvement.

## Features

- Resume and job description matching
- Matched and missing skill identification
- Resume improvement recommendations
- Resume quality checks
- Resume analysis history
- Explainable ATS score interface

## Tech Stack

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Node.js, Express.js
- **Databases:** MySQL, MongoDB

## Project Structure

```text
ResumeIQ/
├── backend/
├── frontend/
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

Install Node.js, npm, MySQL, and MongoDB.

### 1. Clone the repository

```bash
git clone https://github.com/adithlal23/ResumeIQ.git
cd ResumeIQ
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
npm run dev
```

### 3. Install backend dependencies

Open a second terminal from the project root:

```bash
cd backend
npm install
node server.js
```

The backend currently runs at `http://localhost:5000` in the local development setup.

### 4. Configure environment variables

Create `backend/.env` with the database credentials and other variables required by the application. Never publish passwords, API keys, or other secrets.

Make sure MySQL and MongoDB are running before testing the application.

## Project Goal

ResumeIQ aims to help job seekers understand how their resumes align with target roles and identify areas that may need improvement.

## Author

**Adith Lal,jestin mathew,shreee phalke **

GitHub: [@adithlal23](https://github.com/adithlal23)