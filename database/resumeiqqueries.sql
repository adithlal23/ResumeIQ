
CREATE DATABASE IF NOT EXISTS resumeiq;
USE resumeiq;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(150) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resumes (
    resume_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(10),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    job_id INT AUTO_INCREMENT PRIMARY KEY,
    job_title VARCHAR(150),
    company_name VARCHAR(150),
    job_description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
    skill_id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS resume_skills (
    resume_id INT NOT NULL,
    skill_id INT NOT NULL,
    PRIMARY KEY (resume_id, skill_id),
    FOREIGN KEY (resume_id) REFERENCES resumes(resume_id)
        ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_skills (
    job_id INT NOT NULL,
    skill_id INT NOT NULL,
    PRIMARY KEY (job_id, skill_id),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id)
        ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analysis (
    analysis_id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT NOT NULL,
    job_id INT NOT NULL,
    match_score DECIMAL(5,2) DEFAULT 0,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(resume_id),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id)
);

CREATE TABLE IF NOT EXISTS recommendations (
    recommendation_id INT AUTO_INCREMENT PRIMARY KEY,
    analysis_id INT NOT NULL,
    recommendation_text TEXT NOT NULL,
    FOREIGN KEY (analysis_id) REFERENCES analysis(analysis_id)
        ON DELETE CASCADE
);
USE resumeiq;

-- 1. Check saved resumes
SELECT * FROM resumes ORDER BY resume_id DESC;

-- 2. Check saved job descriptions
SELECT * FROM jobs ORDER BY job_id DESC;

-- 3. Check analysis scores
SELECT * FROM analysis ORDER BY analysis_id DESC;

-- 4. Check recommendations
SELECT * FROM recommendations
ORDER BY recommendation_id DESC;

-- 5. Check skills associated with the latest resume
SELECT r.resume_id, r.file_name, s.skill_name
FROM resumes r
JOIN resume_skills rs ON r.resume_id = rs.resume_id
JOIN skills s ON rs.skill_id = s.skill_id
ORDER BY r.resume_id DESC;

-- 6. Check skills associated with job descriptions
SELECT j.job_id, s.skill_name
FROM jobs j
JOIN job_skills js ON j.job_id = js.job_id
JOIN skills s ON js.skill_id = s.skill_id
ORDER BY j.job_id DESC;
SELECT * FROM analysis ORDER BY analysis_id DESC;
USE resumeiq;

SELECT
    a.analysis_id,
    a.resume_id,
    r.file_name,
    j.job_title,
    a.match_score,
    a.analyzed_at
FROM analysis a
JOIN resumes r ON a.resume_id = r.resume_id
JOIN jobs j ON a.job_id = j.job_id
ORDER BY a.analysis_id DESC;