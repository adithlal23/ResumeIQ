# ResumeIQ — AI Resume Analyzer

ResumeIQ is an AI-powered resume analysis project that helps job seekers compare their resumes with job descriptions, identify skill gaps, and receive recommendations for improvement. It aims to help users understand how their resumes align with their target roles.

## Features

- Resume and job description matching
- Identification of matched and missing skills
- Resume improvement recommendations
- Resume quality checks
- Resume analysis history
- Explainable ATS score interface

## Tech Stack

| Component | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Relational Database | MySQL |
| NoSQL Database | MongoDB |
| Version Control | Git and GitHub |

## Team Members

| Name          |    Roll Number    |
| Adith Lal     |    1262241515     |
| Jestin Mathew |    1262241672     |
| Shreee Phalke |    1272241839     |

## Project Structure

```text
ResumeIQ/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── mongo.js
│   └── .env
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
├── .gitignore
└── README.md
```

*The structure above highlights key files. Your actual project may contain additional files and folders.*

## Prerequisites

Install the following software before running the project:

- Node.js and npm
- MySQL Server
- MongoDB, if required by your backend configuration
- Git

## Setup and Execution Instructions

### 1. Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/adithlal23/ResumeIQ.git
cd ResumeIQ
```

### 2. Configure the Backend

Open a terminal in the project root and run:

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory and add the environment variables required by your application.

Example format:

```env
PORT=5000
# Add your actual MySQL and MongoDB connection variables here.
```

Use the exact variable names expected by your backend code. Do not upload passwords, API keys, or other secrets to GitHub.

### 3. Configure MySQL

1. Start your MySQL server.
2. Open MySQL Workbench or your preferred MySQL client.
3. Create or import the database used by the application.
4. Create the required tables using your project's actual database schema.
5. Configure the MySQL connection details in `backend/.env`.

Ensure that the database name, username, password, and port match your local MySQL configuration.

### 4. Configure MongoDB

1. Start your MongoDB service or configure your MongoDB deployment.
2. Add the appropriate MongoDB connection string to `backend/.env`.
3. Ensure that the variable name matches the one used in your backend code.

Never commit database credentials or connection strings containing secrets.

### 5. Start the Backend

From the `backend` directory, run:

```bash
node server.js
```

The backend is configured to run at `http://localhost:5000` in the local development setup, provided the required configuration and dependencies are correct.

### 6. Start the Frontend

Open a **second terminal** in the project root and run:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your browser.

Keep the backend and frontend terminals running while testing the application.

## Database Design and Documentation

ResumeIQ uses MySQL for relational data and MongoDB for NoSQL data, according to the project's configuration.

The database documentation for the project should include:

- Entity-Relationship (ER) diagram
- Tables and their attributes
- Primary keys and foreign keys
- Constraints and relationships
- Normalization
- Sample SQL queries and their outputs

Refer to the actual database schema and project configuration when preparing these materials.

## Version Control and Collaboration

The project is maintained using Git and GitHub.

Repository: https://github.com/adithlal23/ResumeIQ

Team members can clone the repository, work on assigned tasks, test changes, and contribute through Git commits and pushes.

## Project Goal

ResumeIQ aims to help job seekers understand how their resumes align with target roles, identify missing skills, and discover areas for improvement.

## Sustainable Development Goal

**SDG 8 — Decent Work and Economic Growth**

ResumeIQ supports this goal by helping job seekers evaluate their resumes against job requirements and identify skills they may need to improve.

## Author

GitHub: https://github.com/adithlal23