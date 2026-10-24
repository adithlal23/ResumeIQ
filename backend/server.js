const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const WordExtractor = require("word-extractor");
require("dotenv").config();

const pool = require("./db");
const { connectMongo } = require("./mongo");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = /\.(pdf|doc|docx)$/i.test(
      path.extname(file.originalname)
    );

    if (allowed) return callback(null, true);

    callback(new Error("Only PDF, DOC, and DOCX files are allowed."));
  },
});

app.get("/", (req, res) => {
  res.json({ message: "Backend connected successfully!" });
});

// Extract text from PDF, DOC, or DOCX.
app.post("/api/extract-pdf", upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Please upload a PDF, DOC, or DOCX resume.",
    });
  }

  try {
    const extension = path.extname(req.file.originalname).toLowerCase();
    let resumeText = "";

    if (extension === ".pdf") {
      const parser = new PDFParse({ data: req.file.buffer });

      try {
        const result = await parser.getText();
        resumeText = result.text || "";
      } finally {
        await parser.destroy();
      }
    } else if (extension === ".docx") {
      const result = await mammoth.extractRawText({
        buffer: req.file.buffer,
      });

      resumeText = result.value || "";
    } else if (extension === ".doc") {
      const extractor = new WordExtractor();
      const document = await extractor.extract(req.file.buffer);

      resumeText = document.getBody() || "";
    }

    resumeText = resumeText.trim();

    if (!resumeText) {
      return res.status(422).json({
        message:
          "No readable text was found in this file. If it is a scanned PDF, OCR may be required.",
      });
    }

    return res.json({
      resumeText,
      characters: resumeText.length,
      fileName: req.file.originalname,
    });
  } catch (error) {
    console.error("Resume extraction error:", error);

    return res.status(500).json({
      message: "Could not extract text from the resume.",
    });
  }
});

const SKILLS = [
  "python",
  "java",
  "c++",
  "sql",
  "machine learning",
  "deep learning",
  "artificial intelligence",
  "data analysis",
  "excel",
  "power bi",
  "tableau",
  "javascript",
  "react",
  "node.js",
  "mongodb",
  "mysql",
  "html",
  "css",
  "communication",
  "project management",
  "statistics",
  "pandas",
  "numpy",
  "scikit-learn",
  "tensorflow",
  "pytorch",
  "data structures",
  "algorithms",
  "computer vision",
  "natural language processing",
  "git",
  "github",
  "docker",
  "cloud computing",
  "problem solving",
];

async function getOrCreateSkill(connection, skillName) {
  await connection.execute(
    "INSERT IGNORE INTO skills (skill_name) VALUES (?)",
    [skillName]
  );

  const [rows] = await connection.execute(
    "SELECT skill_id FROM skills WHERE skill_name = ?",
    [skillName]
  );

  if (!rows.length) {
    throw new Error(`Could not create or retrieve skill: ${skillName}`);
  }

  return rows[0].skill_id;
}

// Analyze resume and save the result to MySQL and MongoDB.
app.post("/api/analyze", async (req, res) => {
  const { resumeText, jobDescription, fileName } = req.body || {};

  if (typeof resumeText !== "string" || !resumeText.trim()) {
    return res.status(400).json({
      message: "Resume text is required.",
    });
  }

  if (
    typeof jobDescription !== "string" ||
    !jobDescription.trim()
  ) {
    return res.status(400).json({
      message: "Job description is required.",
    });
  }

  const normalizedResume = resumeText.toLowerCase();
  const normalizedJob = jobDescription.toLowerCase();

  const matchedSkills = SKILLS.filter(
    (skill) =>
      normalizedResume.includes(skill) &&
      normalizedJob.includes(skill)
  );

  const requiredSkills = SKILLS.filter((skill) =>
    normalizedJob.includes(skill)
  );

  const missingSkills = requiredSkills.filter(
    (skill) => !matchedSkills.includes(skill)
  );

  const matchScore = requiredSkills.length
    ? Math.round(
        (matchedSkills.length / requiredSkills.length) * 100
      )
    : 0;

  const recommendations = [];

  if (missingSkills.length) {
    recommendations.push(
      `Consider developing or highlighting these skills: ${missingSkills.join(", ")}.`
    );
  }

  if (!/projects|project experience/i.test(resumeText)) {
    recommendations.push(
      "Add a Projects section with concrete outcomes and technologies used."
    );
  }

  if (!/experience|internship|employment/i.test(resumeText)) {
    recommendations.push(
      "Add relevant internship, work, or practical experience if available."
    );
  }

  if (!/education|academic|qualification/i.test(resumeText)) {
    recommendations.push(
      "Include an Education section with your qualification and institution."
    );
  }

  if (!recommendations.length) {
    recommendations.push(
      "Your resume covers the detected job-description skills. Tailor achievements to the target role."
    );
  }

  const qualityChecks = {
    emailPresent: /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(resumeText),
    phonePresent: /(?:\+?\d[\d\s().-]{7,}\d)/.test(resumeText),
    educationPresent: /education|academic|qualification/i.test(resumeText),
    projectsPresent: /projects|project experience/i.test(resumeText),
    experiencePresent: /experience|internship|employment/i.test(resumeText),
    achievementsPresent:
      /\b(achieved|improved|increased|reduced|built|developed|led|created)\b/i.test(
        resumeText
      ),
  };
  
  // Explainable ResumeIQ score (estimated, not an official ATS score)
  const scoringComponents = [
    {
      key: "jobMatch",
      label: "Job Description Skill Match",
      score: matchScore,
      weight: 50,
      explanation:
        "Measures how many detected job-description skills are also present in the resume.",
    },
    {
      key: "contact",
      label: "Contact Details",
      score:
        Number(qualityChecks.emailPresent) * 50 +
        Number(qualityChecks.phonePresent) * 50,
      weight: 10,
      explanation:
        "Checks whether an email address and phone number are present.",
    },
    {
      key: "sections",
      label: "Resume Sections",
      score:
        [
          qualityChecks.educationPresent,
          qualityChecks.projectsPresent,
          qualityChecks.experiencePresent,
        ].filter(Boolean).length / 3 * 100,
      weight: 20,
      explanation:
        "Checks for Education, Projects, and Experience sections.",
    },
    {
      key: "achievements",
      label: "Achievements and Action Words",
      score: qualityChecks.achievementsPresent ? 100 : 0,
      weight: 20,
      explanation:
        "Checks for action words such as built, developed, improved, and achieved.",
    },
  ].map((component) => ({
    ...component,
    points: Number(
      (component.score * component.weight / 100).toFixed(1)
    ),
  }));

  const atsScore = Math.round(
    scoringComponents.reduce(
      (total, component) => total + component.points,
      0
    )
  );

  const scoreBreakdown = {
    overallScore: atsScore,
    components: scoringComponents,
    methodology:
      "The score is a weighted estimate: job-description skill match 50%, contact details 10%, resume sections 20%, and achievements/action words 20%. Each factor is scored from 0 to 100 and multiplied by its weight.",
    limitations:
      "This is ResumeIQ's own heuristic estimate, not an official ATS score. It does not guarantee screening results and does not evaluate every formatting or recruitment-system requirement.",
  };


  let connection;
  let resumeId;
  let jobId;
  let analysisId;

  const actualFileName =
    typeof fileName === "string" && fileName.trim()
      ? fileName.trim()
      : "uploaded-resume";

  const fileType =
    path.extname(actualFileName).replace(".", "").toLowerCase() ||
    null;

  // Save relational data to MySQL.
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [resumeInsert] = await connection.execute(
      "INSERT INTO resumes (user_id, file_name, file_type) VALUES (NULL, ?, ?)",
      [actualFileName, fileType]
    );

    resumeId = resumeInsert.insertId;

    const [jobInsert] = await connection.execute(
      "INSERT INTO jobs (job_title, company_name, job_description) VALUES (?, ?, ?)",
      ["Job Description", null, jobDescription.trim()]
    );

    jobId = jobInsert.insertId;

    for (const skill of matchedSkills) {
      const skillId = await getOrCreateSkill(connection, skill);

      await connection.execute(
        "INSERT IGNORE INTO resume_skills (resume_id, skill_id) VALUES (?, ?)",
        [resumeId, skillId]
      );
    }

    for (const skill of requiredSkills) {
      const skillId = await getOrCreateSkill(connection, skill);

      await connection.execute(
        "INSERT IGNORE INTO job_skills (job_id, skill_id) VALUES (?, ?)",
        [jobId, skillId]
      );
    }

    const [analysisInsert] = await connection.execute(
      "INSERT INTO analysis (resume_id, job_id, match_score) VALUES (?, ?, ?)",
      [resumeId, jobId, matchScore]
    );

    analysisId = analysisInsert.insertId;

    for (const recommendation of recommendations) {
      await connection.execute(
        "INSERT INTO recommendations (analysis_id, recommendation_text) VALUES (?, ?)",
        [analysisId, recommendation]
      );
    }

    await connection.commit();
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("MySQL rollback error:", rollbackError);
      }
    }

    console.error("MySQL analysis save error:", error);

    return res.status(500).json({
      message:
        "Analysis could not be saved to MySQL. Check the backend terminal and database schema.",
    });
  } finally {
    if (connection) connection.release();
  }

  // Save the complete analysis document to MongoDB.
  let mongoSaved = false;

  try {
    const mongoDb = await connectMongo();

    await mongoDb.collection("resume_analyses").insertOne({
      resumeId,
      jobId,
      analysisId,
      fileName: actualFileName,
      resumeText,
      jobDescription,
      matchScore,
      atsScore,
      scoreBreakdown,
      matchedSkills,
      missingSkills,
      totalRequiredSkills: requiredSkills.length,
      recommendations,
      qualityChecks,
      createdAt: new Date(),
    });

    mongoSaved = true;
  } catch (error) {
    console.error("MongoDB analysis save error:", error);
  }

  return res.json({
    success: true,
    message: "Resume analyzed successfully.",
    resumeId,
    jobId,
    analysisId,
    mysqlSaved: true,
    mongoSaved,
    matchScore,
    matchedSkills,
    missingSkills,
    totalRequiredSkills: requiredSkills.length,
    recommendations,
    qualityChecks,
  });
});

// Get the latest analysis records.
app.get("/api/history", async (req, res) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10) || 20;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);

    const [rows] = await pool.execute(
      `SELECT
         a.analysis_id AS analysisId,
         a.match_score AS matchScore,
         a.analyzed_at AS analyzedAt,
         r.resume_id AS resumeId,
         r.file_name AS fileName,
         r.file_type AS fileType,
         j.job_id AS jobId,
         j.job_title AS jobTitle,
         j.company_name AS companyName,
         j.job_description AS jobDescription
       FROM analysis a
       JOIN resumes r ON r.resume_id = a.resume_id
       JOIN jobs j ON j.job_id = a.job_id
       ORDER BY a.analyzed_at DESC, a.analysis_id DESC
       LIMIT ${limit}`
    );

    const analysisIds = rows.map((row) => row.analysisId);

    let mongoDocs = [];

    if (analysisIds.length) {
      try {
        const mongoDb = await connectMongo();

        mongoDocs = await mongoDb
          .collection("resume_analyses")
          .find(
            { analysisId: { $in: analysisIds } },
            {
              projection: {
                _id: 0,
                analysisId: 1,
                matchedSkills: 1,
                missingSkills: 1,
                totalRequiredSkills: 1,
                recommendations: 1,
                qualityChecks: 1,
              },
            }
          )
          .toArray();
      } catch (mongoError) {
        console.error("MongoDB history lookup error:", mongoError);
      }
    }

    const mongoById = new Map(
      mongoDocs.map((doc) => [doc.analysisId, doc])
    );

    let recommendationRows = [];

    if (analysisIds.length) {
      const placeholders = analysisIds.map(() => "?").join(",");

      const [rowsForRecommendations] = await pool.execute(
        `SELECT analysis_id AS analysisId,
                recommendation_text AS recommendationText
         FROM recommendations
         WHERE analysis_id IN (${placeholders})
         ORDER BY recommendation_id`,
        analysisIds
      );

      recommendationRows = rowsForRecommendations;
    }

    const recommendationsById = new Map();

    for (const row of recommendationRows) {
      if (!recommendationsById.has(row.analysisId)) {
        recommendationsById.set(row.analysisId, []);
      }

      recommendationsById
        .get(row.analysisId)
        .push(row.recommendationText);
    }

    return res.json({
      success: true,
      history: rows.map((row) => {
        const mongo = mongoById.get(row.analysisId) || {};

        return {
          ...row,
          matchScore: Number(row.matchScore),
          recommendations:
            mongo.recommendations ||
            recommendationsById.get(row.analysisId) ||
            [],
          matchedSkills: mongo.matchedSkills || [],
          missingSkills: mongo.missingSkills || [],
          totalRequiredSkills: mongo.totalRequiredSkills ?? null,
          qualityChecks: mongo.qualityChecks || null,
          atsScore: mongo.atsScore ?? null,
          scoreBreakdown: mongo.scoreBreakdown ?? null,
          mongoDetailsAvailable: mongoById.has(row.analysisId),
        };
      }),
    });
  } catch (error) {
    console.error("Analysis history error:", error);

    return res.status(500).json({
      message: "Could not retrieve analysis history from the database.",
    });
  }
});

// Get the full details of one analysis.
app.get("/api/history/:analysisId", async (req, res) => {
  const analysisId = Number.parseInt(req.params.analysisId, 10);

  if (!Number.isInteger(analysisId) || analysisId < 1) {
    return res.status(400).json({
      message: "A valid analysis ID is required.",
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT
         a.analysis_id AS analysisId,
         a.match_score AS matchScore,
         a.analyzed_at AS analyzedAt,
         r.resume_id AS resumeId,
         r.file_name AS fileName,
         r.file_type AS fileType,
         j.job_id AS jobId,
         j.job_title AS jobTitle,
         j.company_name AS companyName,
         j.job_description AS jobDescription
       FROM analysis a
       JOIN resumes r ON r.resume_id = a.resume_id
       JOIN jobs j ON j.job_id = a.job_id
       WHERE a.analysis_id = ?
       LIMIT 1`,
      [analysisId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Analysis history record not found.",
      });
    }

    const [recommendationRows] = await pool.execute(
      `SELECT recommendation_text AS recommendationText
       FROM recommendations
       WHERE analysis_id = ?
       ORDER BY recommendation_id`,
      [analysisId]
    );

    let mongoDetails = null;

    try {
      const mongoDb = await connectMongo();

      mongoDetails = await mongoDb
        .collection("resume_analyses")
        .findOne(
          { analysisId },
          { projection: { _id: 0 } }
        );
    } catch (mongoError) {
      console.error("MongoDB detailed history lookup error:", mongoError);
    }

    return res.json({
      success: true,
      history: {
        ...rows[0],
        matchScore: Number(rows[0].matchScore),
        recommendations:
          mongoDetails?.recommendations ||
          recommendationRows.map((row) => row.recommendationText),
        matchedSkills: mongoDetails?.matchedSkills || [],
        missingSkills: mongoDetails?.missingSkills || [],
        totalRequiredSkills: mongoDetails?.totalRequiredSkills ?? null,
        qualityChecks: mongoDetails?.qualityChecks || null,
        atsScore: mongoDetails?.atsScore ?? null,
       scoreBreakdown: mongoDetails?.scoreBreakdown ?? null,
        resumeText: mongoDetails?.resumeText || null,
        mongoDetailsAvailable: Boolean(mongoDetails),
      },
    });
  } catch (error) {
    console.error("Detailed analysis history error:", error);

    return res.status(500).json({
      message: "Could not retrieve this analysis.",
    });
  }
});

// Handle upload and API errors.
app.use((error, req, res, next) => {
  console.error("API error:", error);

  if (
    error instanceof multer.MulterError &&
    error.code === "LIMIT_FILE_SIZE"
  ) {
    return res.status(413).json({
      message: "File is too large. Maximum size is 10 MB.",
    });
  }

  return res.status(400).json({
    message: error.message || "An unexpected request error occurred.",
  });
});

app.listen(PORT, () => {
  console.log(`ResumeIQ backend running on http://localhost:${PORT}`);
});