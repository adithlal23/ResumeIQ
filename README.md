# ResumeIQ — AI Resume Analyzer

## Project Description

ResumeIQ is an AI-powered resume analysis project designed to help job seekers evaluate their resumes against job descriptions. It helps identify matching and missing skills, assess resume quality, and provide recommendations for improvement so that users can better understand their alignment with target job roles.

## Features

- Resume and job description matching
- Identification of matched and missing skills
- Resume improvement recommendations
- Resume quality checks
- Resume analysis history
- ATS score interface for understanding resume-job alignment

## Tech Stack

| Component | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Relational Database | MySQL |
| NoSQL Database | MongoDB |
| Version Control | Git and GitHub |

## Team Members

| Name | Roll Number |
| Adith Lal | 1262241515 |
| Jestin Mathew | 1262241672 |
| Shreee Phalke | 1262241839 |

## Project Structure

```text
ResumeIQ/
├── backend/
│   ├── server.js
│   ├── db.js
│   └── mongo.js
├── frontend/
│   ├── src/
│   └── package.json
├── .gitignore
└── README.md
```

## Prerequisites

The following software and services are required to run the application:

- Node.js and npm
- MySQL Server
- MongoDB, where required by the application configuration
- Git

## Setup and Execution Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/adithlal23/ResumeIQ.git
cd ResumeIQ
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

Configure the required environment variables in a `.env` file inside the `backend` directory. These variables include the database connection details and any other configuration required by the application.

### 3. Configure the Databases

**MySQL**
- Start the MySQL server.
- Create or import the database and tables required by the application.
- Configure the MySQL connection details in the backend environment variables.

**MongoDB**
- Start the MongoDB service or configure the required MongoDB deployment.
- Configure the MongoDB connection string in the backend environment variables.

The database configuration must match the application's existing backend code.

### 4. Start the Backend Server

From the `backend` directory, run:

```bash
node server.js
```

The backend uses port 5000 in the local development setup, subject to the application configuration.

### 5. Install Frontend Dependencies and Start the Application

Open a separate terminal in the project root and run:

```bash
cd frontend
npm install
npm run dev
```

Open the local development URL displayed in the terminal to access the frontend.

Keep the backend server running while using the application.

## Database Design and Management

ResumeIQ uses MySQL to manage structured project data, including users, resumes, job descriptions, skills, analysis results, and recommendations.

The database consists of eight related tables designed to organize information and maintain relationships between entities.

Key database concepts used in the project include:
- **Primary Keys:** Uniquely identify records in each table.
- **Foreign Keys:** Maintain relationships between related tables.
- **Many-to-Many Relationships:** Connect resumes with skills and jobs with skills through junction tables.
- **SQL Queries:** Retrieve and organize data stored in the database.

The project also includes MongoDB for NoSQL data storage.

## Version Control and Collaboration

Git and GitHub are used for source code management and collaborative development.

**GitHub Repository:** https://github.com/adithlal23/ResumeIQ

The repository contains the project source code and documentation to support development, testing, and collaboration among team members.

## Project Goal

The goal of ResumeIQ is to help job seekers understand how their resumes align with job requirements, identify skill gaps, and recognize opportunities to improve their resumes.

## Sustainable Development Goal

**SDG 8 — Decent Work and Economic Growth**

ResumeIQ aligns with SDG 8 by helping job seekers assess their resumes against job requirements and identify skills they may need to develop, supporting their preparation for employment opportunities.

## Author
Team Contribution — Jestin Mathew

Contributed to project documentation and reviewed the
ResumeIQ database design.

GitHub: https://github.com/adithlal23,
https://github.com/Shree-Phalke2006.

