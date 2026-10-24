import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./App.css";

const API = "http://localhost:5000";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "analyze", label: "Analyze Resume", icon: "✳" },
  { id: "resumes", label: "My Resumes", icon: "▤" },
  { id: "matches", label: "Job Matches", icon: "◎" },
  { id: "history", label: "Analysis History", icon: "◷" },
];

const FEATURES = [
  "ATS Score",
  "Keyword Match",
  "Skills Match",
  "Experience Relevance",
  "Resume Structure",
  "Education Relevance",
  "Formatting & Readability",
];

function getScore(item) {
  return Number(item?.matchScore ?? item?.match_score ?? 0);
}

function getId(item) {
  return item?.analysisId ?? item?.analysis_id ?? item?.id;
}

function getDate(item) {
  const date = item?.analyzedAt ?? item?.analyzed_at ?? item?.createdAt;
  if (!date) return "Date unavailable";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "Date unavailable"
    : parsed.toLocaleDateString();
}

function getName(item) {
  return item?.fileName ?? item?.file_name ?? item?.resumeName ?? "Resume";
}

function getTitle(item) {
  return item?.jobTitle ?? item?.job_title ?? "Job analysis";
}

function getArray(item, key) {
  return Array.isArray(item?.[key]) ? item[key] : [];
}

function normalizeHistoryItem(item) {
  return {
    ...item,
    analysisId: getId(item),
    fileName: getName(item),
    jobTitle: getTitle(item),
    matchScore: getScore(item),
    matchedSkills: getArray(item, "matchedSkills"),
    missingSkills: getArray(item, "missingSkills"),
    recommendations: getArray(item, "recommendations"),
    analyzedAt: item?.analyzedAt ?? item?.analyzed_at ?? item?.createdAt,
  };
}

function Icon({ children }) {
  return (
    <span className="nav-icon" aria-hidden="true">
      {children}
    </span>
  );
}

function ScoreRing({ score = 0, label, color, suffix = "/100" }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));

  return (
    <div className="score-card">
      <div
        className="score-ring"
        style={{
          "--score": `${value * 3.6}deg`,
          "--score-color": color || "#7357ee",
        }}
      >
        <div className="score-ring-inner">
          <strong>{Math.round(value)}</strong>
          <span>{suffix}</span>
        </div>
      </div>
      <span className="score-label">{label}</span>
    </div>
  );
}

function ProgressRow({ label, value, color = "#7057e8" }) {
  const percentage = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="progress-row">
      <div className="progress-heading">
        <span>{label}</span>
        <strong>{Math.round(percentage)}%</strong>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%`, background: color }}
        />
      </div>
    </div>
  );
}

function EmptyState({
  icon = "▤",
  title,
  description,
  action,
  onAction,
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="btn btn-primary" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

function App() {
  const [page, setPage] = useState("dashboard");
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [apiStatus, setApiStatus] = useState("checking");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError("");

    try {
      const response = await fetch(`${API}/api/history?limit=100`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not load analysis history."
        );
      }

      const items = Array.isArray(data)
        ? data
        : data.history || data.analyses || data.records || [];

      setHistory(items.map(normalizeHistoryItem));
      setApiStatus("online");
    } catch (err) {
      setHistoryError(
        err.message || "Unable to load saved analyses."
      );
      setApiStatus("offline");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetch(`${API}/`)
      .then((response) => {
        if (!response.ok) throw new Error("Backend unavailable");
        return response.json();
      })
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));

    loadHistory();
  }, [loadHistory]);

  const averageScore = useMemo(() => {
    if (!history.length) return 0;

    return Math.round(
      history.reduce((sum, item) => sum + getScore(item), 0) /
        history.length
    );
  }, [history]);

  const uniqueResumes = useMemo(() => {
    const seen = new Set();

    return history.filter((item) => {
      const key = item.resumeId ?? item.resume_id ?? getName(item);

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }, [history]);

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    if (!query) return history;

    return history.filter((item) =>
      `${getName(item)} ${getTitle(item)} ${getDate(item)}`
        .toLowerCase()
        .includes(query)
    );
  }, [history, historySearch]);

  function navigate(nextPage) {
    setPage(nextPage);
    setSelected(null);
    setNotice("");
    setError("");

    if (
      nextPage === "history" ||
      nextPage === "resumes" ||
      nextPage === "matches"
    ) {
      loadHistory();
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const extension = file.name.split(".").pop().toLowerCase();

    if (!["pdf", "doc", "docx"].includes(extension)) {
      setError("Please upload a PDF, DOC, or DOCX resume.");
      setResume(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("The file must be smaller than 10 MB.");
      setResume(null);
      return;
    }

    setResume(file);
    setError("");
    setResult(null);
  }

  async function handleAnalyze(event) {
    event.preventDefault();

    if (!resume) {
      setError("Please upload your resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please enter the job description.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("resume", resume);

      const extractionResponse = await fetch(
        `${API}/api/extract-pdf`,
        {
          method: "POST",
          body: formData,
        }
      );

      const extractionData = await extractionResponse.json();

      if (!extractionResponse.ok) {
        throw new Error(
          extractionData.message ||
            "Resume text extraction failed."
        );
      }

      const analysisResponse = await fetch(
        `${API}/api/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText: extractionData.resumeText,
            jobDescription: jobDescription.trim(),
            fileName: resume.name,
            jobTitle: jobTitle.trim() || "Job analysis",
          }),
        }
      );

      const analysisData = await analysisResponse.json();

      if (!analysisResponse.ok) {
        throw new Error(
          analysisData.message || "Resume analysis failed."
        );
      }

      const normalized = normalizeHistoryItem({
        ...analysisData,
        fileName: resume.name,
        jobTitle: jobTitle.trim() || "Job analysis",
        resumeText: extractionData.resumeText,
        jobDescription: jobDescription.trim(),
      });

      setResult(normalized);
      setSelected(normalized);

      setNotice(
        analysisData.mongoSaved === false
          ? "Analysis completed, but MongoDB did not save this document."
          : "Analysis completed successfully."
      );

      await loadHistory();
    } catch (err) {
      setError(err.message || "Unable to analyze your resume.");
    } finally {
      setBusy(false);
    }
  }

  async function openAnalysis(item) {
    const id = getId(item);

    if (id == null) {
      setSelected(item);
      return;
    }

    try {
      const response = await fetch(`${API}/api/history/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load analysis details."
        );
      }

      setSelected(normalizeHistoryItem(data.analysis || data));
    } catch {
      setSelected(item);
      setNotice(
        "Showing the saved summary. Full details could not be loaded."
      );
    }
  }

  function startNewAnalysis() {
    setResume(null);
    setJobDescription("");
    setJobTitle("");
    setResult(null);
    setSelected(null);
    setError("");
    setNotice("");
    setPage("analyze");
  }

  // Generate and download a PDF report for the selected analysis.
  function downloadPDFReport(item = selected || result) {
    if (!item) {
      setNotice(
        "Please analyze a resume before downloading a report."
      );
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    let y = 48;

    const ensureSpace = (needed = 12) => {
      if (y + needed > pageHeight - 18) {
        doc.addPage();
        y = 20;
      }
    };

    const addSectionTitle = (title) => {
      ensureSpace(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(39, 39, 80);
      doc.text(title, margin, y);
      y += 8;
    };

    const addWrappedText = (text, fontSize = 10) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(55, 55, 70);

      const lines = doc.splitTextToSize(
        String(text ?? ""),
        pageWidth - margin * 2
      );

      lines.forEach((line) => {
        ensureSpace(fontSize * 0.55 + 4);
        doc.text(line, margin, y);
        y += fontSize * 0.55 + 3;
      });

      y += 2;
    };

    const matchedSkills = Array.isArray(item.matchedSkills)
      ? item.matchedSkills
      : [];

    const missingSkills = Array.isArray(item.missingSkills)
      ? item.missingSkills
      : [];

    const recommendations = Array.isArray(item.recommendations)
      ? item.recommendations
      : [];

    const qualityChecks =
      item.qualityChecks &&
      typeof item.qualityChecks === "object"
        ? item.qualityChecks
        : {};

    const score = getScore(item);

    // Branded report header.
    doc.setFillColor(39, 39, 80);
    doc.rect(0, 0, pageWidth, 36, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("ResumeIQ", margin, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("AI-Powered Resume Analysis Report", margin, 26);

    // Resume details.
    doc.setTextColor(45, 45, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Resume:", margin, y);

    doc.setFont("helvetica", "normal");

    const resumeNameLines = doc.splitTextToSize(
      getName(item),
      pageWidth - margin * 2 - 24
    );

    doc.text(resumeNameLines, margin + 23, y);
    y += Math.max(8, resumeNameLines.length * 5);

    addWrappedText(`Job title: ${getTitle(item)}`);
    addWrappedText(`Analysis date: ${getDate(item)}`);

    // Match score.
    addSectionTitle("Job Match Score");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(25);
    doc.setTextColor(115, 87, 238);
    doc.text(`${Math.round(score)}%`, margin, y + 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(75, 75, 90);

    doc.text(
      "Based on the current ResumeIQ skill-matching logic.",
      margin + 30,
      y
    );

    y += 15;

    // Matched skills.
    addSectionTitle(`Matched Skills (${matchedSkills.length})`);

    addWrappedText(
      matchedSkills.length
        ? matchedSkills.join(", ")
        : "No matched skills were returned."
    );

    // Missing skills.
    addSectionTitle(`Skills to Improve (${missingSkills.length})`);

    addWrappedText(
      missingSkills.length
        ? missingSkills.join(", ")
        : "No missing skills were returned."
    );

    // Quality checks.
    addSectionTitle("Resume Quality Checks");

    if (Object.keys(qualityChecks).length) {
      const qualityRows = Object.entries(qualityChecks).map(
        ([key, value]) => [
          key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (character) => character.toUpperCase()),
          typeof value === "boolean"
            ? value
              ? "Detected"
              : "Not detected"
            : String(value ?? "Not available"),
        ]
      );

      autoTable(doc, {
        startY: y,
        head: [["Check", "Result"]],
        body: qualityRows,
        margin: { left: margin, right: margin },
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [39, 39, 80],
        },
      });

      y = doc.lastAutoTable.finalY + 10;
    } else {
      addWrappedText(
        "No quality-check details were returned for this analysis."
      );
    }

    // Recommendations.
    addSectionTitle("Personalized Recommendations");

    if (recommendations.length) {
      recommendations.forEach((recommendation, index) => {
        const recommendationText =
          typeof recommendation === "string"
            ? recommendation
            : recommendation?.recommendation_text ||
              recommendation?.text ||
              JSON.stringify(recommendation);

        addWrappedText(`${index + 1}. ${recommendationText}`);
      });
    } else {
      addWrappedText(
        "No recommendations were returned for this analysis."
      );
    }

    // Disclaimer.
    ensureSpace(18);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 120);

    const disclaimer =
      "Note: This report reflects the current ResumeIQ matching logic and is not an official ATS certification.";

    doc
      .splitTextToSize(disclaimer, pageWidth - margin * 2)
      .forEach((line) => {
        ensureSpace(6);
        doc.text(line, margin, y);
        y += 4;
      });

    // Add footer and page numbers to every page.
    const totalPages = doc.internal.getNumberOfPages();

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      doc.setPage(pageNumber);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(125, 125, 135);

      doc.text(
        "ResumeIQ | Resume Analysis",
        margin,
        pageHeight - 8
      );

      doc.text(
        `Page ${pageNumber} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: "right" }
      );
    }

    const safeFilename =
      getName(item)
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-z0-9_-]/gi, "_") || "resume";

    doc.save(`ResumeIQ_Report_${safeFilename}.pdf`);
  }

  function renderHeader(title, description, action) {
    return (
      <div className="page-heading">
        <div>
          <p className="eyebrow">RESUMEIQ WORKSPACE</p>
          <h1>{title}</h1>
          <p className="page-description">{description}</p>
        </div>
        {action}
      </div>
    );
  }

  function renderDashboard() {
    return (
      <>
        {renderHeader(
          "Your career dashboard",
          "Understand your resume strength and discover your next opportunity.",
          <button
            className="btn btn-primary"
            onClick={startNewAnalysis}
          >
            ✳ Analyze resume
          </button>
        )}

        <section className="welcome-banner">
          <div>
            <span className="banner-tag">
              YOUR CAREER, IMPROVED
            </span>
            <h2>Make your next application count.</h2>
            <p>
              Compare your resume with a job description and identify
              skills and improvements to focus on.
            </p>
            <button
              className="btn btn-white"
              onClick={startNewAnalysis}
            >
              Start a new analysis{" "}
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="banner-art" aria-hidden="true">
            R<span>✳</span>
          </div>
        </section>

        <section className="stat-grid">
          <StatCard
            icon="▤"
            label="Analyses completed"
            value={history.length}
          />
          <StatCard
            icon="▣"
            label="Resumes tracked"
            value={uniqueResumes.length}
          />
          <StatCard
            icon="◎"
            label="Average match score"
            value={`${averageScore}%`}
          />
          <StatCard
            icon="↗"
            label="Strong matches"
            value={history.filter((item) => getScore(item) >= 70).length}
          />
        </section>

        <section className="content-card">
          <div className="section-heading">
            <div>
              <h2>Recent analyses</h2>
              <p>Your latest resume and job comparisons.</p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => navigate("history")}
            >
              View all
            </button>
          </div>

          {loadingHistory && history.length === 0 ? (
            <p className="muted-message">
              Loading your analyses…
            </p>
          ) : history.length === 0 ? (
            <EmptyState
              title="Your workspace is ready"
              description="Run your first analysis to see your scores and history here."
              action="Analyze your first resume"
              onAction={startNewAnalysis}
            />
          ) : (
            <HistoryTable
              items={history.slice(0, 5)}
              onOpen={openAnalysis}
            />
          )}
        </section>

        <section className="content-card">
          <div className="section-heading">
            <div>
              <h2>Your next steps</h2>
              <p>Get more value from every job application.</p>
            </div>
          </div>

          <div className="feature-grid">
            <FeatureCard
              number="01"
              title="Find skill gaps"
              text="Identify job requirements your resume may be missing."
              onClick={() => navigate("matches")}
            />
            <FeatureCard
              number="02"
              title="Review past analyses"
              text="Compare previous results and revisit recommendations."
              onClick={() => navigate("history")}
            />
            <FeatureCard
              number="03"
              title="Improve your resume"
              text="Use targeted feedback to strengthen your next application."
              onClick={startNewAnalysis}
            />
          </div>
        </section>
      </>
    );
  }

  function renderAnalyze() {
    return (
      <>
        {renderHeader(
          "Analyze your resume",
          "Upload your resume and compare it against a target job.",
          <span className={`connection-pill ${apiStatus}`}>
            <span className="status-dot" />
            {apiStatus === "online"
              ? "Backend connected"
              : apiStatus === "checking"
                ? "Connecting…"
                : "Backend offline"}
          </span>
        )}

        <div className="analyze-layout">
          <form
            className="content-card analyze-form"
            onSubmit={handleAnalyze}
          >
            <div className="section-heading">
              <div>
                <h2>Application details</h2>
                <p>Provide the resume and job details to begin.</p>
              </div>
              <span className="step-chip">STEP 1 OF 2</span>
            </div>

            <label className="field-label">
              Upload resume <span>*</span>
            </label>

            <label
              className={`upload-zone ${resume ? "has-file" : ""}`}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              <span className="upload-symbol">
                {resume ? "✓" : "↑"}
              </span>
              <strong>
                {resume
                  ? resume.name
                  : "Choose a resume to upload"}
              </strong>
              <span>
                {resume
                  ? `${(resume.size / 1024 / 1024).toFixed(2)} MB`
                  : "PDF, DOC or DOCX · Maximum 10 MB"}
              </span>
              <span className="upload-link">
                {resume
                  ? "Choose a different file"
                  : "Browse files"}
              </span>
            </label>

            <label
              className="field-label"
              htmlFor="jobTitle"
            >
              Job title{" "}
              <span className="optional">(optional)</span>
            </label>

            <input
              id="jobTitle"
              className="text-input"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Machine Learning Engineer"
            />

            <label
              className="field-label"
              htmlFor="jobDescription"
            >
              Job description <span>*</span>
            </label>

            <textarea
              id="jobDescription"
              className="text-area"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the complete job description, including responsibilities, skills and qualifications…"
              rows={9}
            />

            <div className="field-hint">
              {jobDescription.length} characters · More detail can
              help identify relevant skills.
            </div>

            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            {notice && (
              <div className="alert alert-success">{notice}</div>
            )}

            <button
              className="btn btn-primary btn-wide"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner" /> Analyzing resume…
                </>
              ) : (
                "✳ Analyze my resume →"
              )}
            </button>

            <p className="privacy-note">
              Your resume is processed by your local backend. Review
              your storage and privacy settings before using sensitive
              documents.
            </p>
          </form>

          <aside className="side-stack">
            <div className="content-card">
              <h3>What you'll receive</h3>
              <ul className="benefit-list">
                <li>
                  <span>✓</span>
                  <div>
                    <strong>Skill comparison</strong>
                    <p>Skills found and skills not identified.</p>
                  </div>
                </li>
                <li>
                  <span>✓</span>
                  <div>
                    <strong>Match score</strong>
                    <p>A score based on the current matching logic.</p>
                  </div>
                </li>
                <li>
                  <span>✓</span>
                  <div>
                    <strong>Resume feedback</strong>
                    <p>Quality checks and improvement suggestions.</p>
                  </div>
                </li>
                <li>
                  <span>✓</span>
                  <div>
                    <strong>Saved history</strong>
                    <p>Review past analysis results.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="tip-card">
              <span>✦ PRO TIP</span>
              <h3>Use the full job description</h3>
              <p>
                Include required skills and responsibilities instead of
                only the job title.
              </p>
            </div>
          </aside>
        </div>

        {result && (
          <section className="content-card result-preview">
            <div className="section-heading">
              <div>
                <h2>Analysis complete</h2>
                <p>Your results are ready to review.</p>
              </div>

              <div className="toolbar-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => downloadPDFReport(result)}
                >
                  ↓ Download PDF
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => openAnalysis(result)}
                >
                  View details →
                </button>
              </div>
            </div>

            <div className="quick-score">
              <ScoreRing
                score={getScore(result)}
                label="Job match"
              />
              <div>
                <h3>{getName(result)}</h3>
                <p>{getTitle(result)}</p>
                <span className="muted-message">
                  {result.matchedSkills.length} matched skills ·{" "}
                  {result.missingSkills.length} missing skills
                </span>
              </div>
            </div>
          </section>
        )}
      </>
    );
  }

  function renderResumes() {
    return (
      <>
        {renderHeader(
          "My resumes",
          "Review resumes associated with your saved analyses.",
          <button
            className="btn btn-primary"
            onClick={startNewAnalysis}
          >
            + Analyze a resume
          </button>
        )}

        <div className="content-card">
          <div className="section-heading">
            <div>
              <h2>Resume library</h2>
              <p>Files recorded by your analysis history.</p>
            </div>
            <span className="count-pill">
              {uniqueResumes.length} resumes
            </span>
          </div>

          {loadingHistory && history.length === 0 ? (
            <p className="muted-message">Loading resumes…</p>
          ) : uniqueResumes.length === 0 ? (
            <EmptyState
              title="No resumes yet"
              description="Analyze a resume to start building your library."
              action="Upload resume"
              onAction={startNewAnalysis}
            />
          ) : (
            <div className="resume-grid">
              {uniqueResumes.map((item, index) => (
                <article
                  className="resume-card"
                  key={
                    item.resumeId ??
                    item.resume_id ??
                    getName(item) + index
                  }
                >
                  <div className="resume-file-icon">PDF</div>
                  <h3>{getName(item)}</h3>
                  <p>Last analyzed {getDate(item)}</p>

                  <div className="resume-card-bottom">
                    <span
                      className={`score-badge ${
                        getScore(item) >= 70 ? "good" : ""
                      }`}
                    >
                      {getScore(item)}% match
                    </span>

                    <button
                      className="text-button"
                      onClick={() => openAnalysis(item)}
                    >
                      View analysis →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="info-note">
            This library is based on files referenced by saved analyses.
            It is not a separate file-storage system.
          </p>
        </div>
      </>
    );
  }

  function renderMatches() {
    return (
      <>
        {renderHeader(
          "Job matches",
          "Explore how your saved resume analyses compare with job descriptions.",
          <button
            className="btn btn-primary"
            onClick={startNewAnalysis}
          >
            + Compare a job
          </button>
        )}

        <div className="content-card">
          <div className="section-heading">
            <div>
              <h2>Your job comparisons</h2>
              <p>
                Open a comparison to review matched skills and skill
                gaps.
              </p>
            </div>
          </div>

          {history.length === 0 ? (
            <EmptyState
              title="No job matches yet"
              description="Analyze a resume against a job description to see your comparisons here."
              action="Start comparison"
              onAction={startNewAnalysis}
            />
          ) : (
            <div className="match-list">
              {history.map((item, index) => (
                <article
                  className="match-row"
                  key={getId(item) ?? index}
                >
                  <div className="match-job-icon">◎</div>

                  <div className="match-info">
                    <h3>{getTitle(item)}</h3>
                    <p>
                      {getName(item)} · {getDate(item)}
                    </p>
                    <div className="match-tags">
                      <span className="tag tag-green">
                        {item.matchedSkills.length} matched
                      </span>
                      <span className="tag tag-red">
                        {item.missingSkills.length} missing
                      </span>
                    </div>
                  </div>

                  <div className="match-score">
                    <strong>{getScore(item)}%</strong>
                    <span>match score</span>
                  </div>

                  <button
                    className="btn btn-secondary"
                    onClick={() => openAnalysis(item)}
                  >
                    View results
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  function renderHistory() {
    return (
      <>
        {renderHeader(
          "Analysis history",
          "Revisit your previous resume evaluations and job comparisons.",
          <button
            className="btn btn-primary"
            onClick={startNewAnalysis}
          >
            + New analysis
          </button>
        )}

        <div className="content-card">
          <div className="history-toolbar">
            <div>
              <h2>All analyses</h2>
              <p>{history.length} saved records loaded</p>
            </div>

            <div className="toolbar-actions">
              <input
                className="search-input"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search analyses…"
                aria-label="Search analyses"
              />

              <button
                className="btn btn-secondary"
                onClick={loadHistory}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {historyError && (
            <div className="alert alert-error">{historyError}</div>
          )}

          {loadingHistory && history.length === 0 ? (
            <p className="muted-message">
              Loading analysis history…
            </p>
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              title="No matching analyses"
              description={
                history.length
                  ? "Try a different search term."
                  : "Your saved analyses will appear here."
              }
              action={history.length ? undefined : "Analyze a resume"}
              onAction={startNewAnalysis}
            />
          ) : (
            <HistoryTable
              items={filteredHistory}
              onOpen={openAnalysis}
            />
          )}
        </div>
      </>
    );
  }

  function renderSettings() {
    return (
      <>
        {renderHeader(
          "Settings",
          "Check your local service connection and workspace information."
        )}

        <div className="settings-grid">
          <div className="content-card">
            <div className="settings-icon">⌘</div>
            <h2>Backend connection</h2>
            <p className="muted-message">
              ResumeIQ API · localhost:5000
            </p>

            <span className={`connection-pill ${apiStatus}`}>
              <span className="status-dot" />
              {apiStatus === "online"
                ? "Connected"
                : apiStatus === "checking"
                  ? "Checking connection"
                  : "Connection unavailable"}
            </span>

            <div className="settings-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  loadHistory();

                  fetch(`${API}/`)
                    .then((r) => {
                      if (!r.ok) throw new Error();
                      setApiStatus("online");
                    })
                    .catch(() => setApiStatus("offline"));
                }}
              >
                Test connection
              </button>
            </div>
          </div>

          <div className="content-card">
            <div className="settings-icon">▤</div>
            <h2>Workspace data</h2>
            <p className="muted-message">
              Your current history is loaded from the ResumeIQ backend.
            </p>

            <div className="settings-stat">
              <span>Analyses loaded</span>
              <strong>{history.length}</strong>
            </div>

            <div className="settings-stat">
              <span>Distinct resumes</span>
              <strong>{uniqueResumes.length}</strong>
            </div>
          </div>

          <div className="content-card settings-wide">
            <h2>About ResumeIQ</h2>
            <p>
              ResumeIQ compares extracted resume text with a job
              description, identifies skill matches and gaps, and stores
              analysis records using MySQL and MongoDB.
            </p>
            <p className="info-note">
              Current scores are based on the matching logic implemented
              in the backend. They should not be represented as scores
              from an official ATS or an independently validated AI model.
            </p>
          </div>
        </div>
      </>
    );
  }

  function renderAnalysisDetail() {
    const item = selected;
    const matched = item?.matchedSkills || [];
    const missing = item?.missingSkills || [];
    const recommendations = item?.recommendations || [];
    const checks = item?.qualityChecks || {};
    const score = getScore(item);

    const tabs = [
      "Overview",
      "Skills",
      "Keywords",
      "Quality",
      "Recommendations",
      "Improvements",
      "Interview",
    ];

    return (
      <div className="detail-page">
        <button
          className="back-button"
          onClick={() => {
            setSelected(null);
            setPage("history");
          }}
        >
          ← Back to history
        </button>

        <div className="detail-heading">
          <div>
            <p className="eyebrow">ANALYSIS REPORT</p>
            <h1>Your resume analysis</h1>
            <p className="page-description">
              {getName(item)} · {getTitle(item)} · {getDate(item)}
            </p>
          </div>

          <div className="toolbar-actions">
            <button
              className="btn btn-primary"
              onClick={() => downloadPDFReport(item)}
            >
              ↓ Download PDF Report
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => window.print()}
            >
              Print report
            </button>
          </div>
        </div>

        <div className="score-grid">
          <ScoreRing
            score={score}
            label="Job Match"
            color="#f59e0b"
          />

          <ScoreRing
            score={
              matched.length + missing.length
                ? (matched.length / (matched.length + missing.length)) *
                  100
                : 0
            }
            label="Skill Match"
            color="#7357ee"
          />

          <ScoreRing
            score={checks?.email && checks?.phone ? 100 : 50}
            label="Contact Details Check"
            color="#0ea5e9"
          />

          <ScoreRing
            score={checks?.education && checks?.projects ? 100 : 50}
            label="Resume Quality Checks"
            color="#10b981"
          />
        </div>

        <div className="detail-tabs">
          
        {/* Explainable ATS Score — new section */}
        <section
          className="content-card report-section"
          id="report-explainable-score"
          style={{ marginBottom: 22 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div>
              <p className="eyebrow">TRANSPARENT SCORING</p>
              <h2>Explainable ATS Score</h2>
              <p className="muted-message">
                Understand which factors contribute to your resume score.
              </p>
            </div>

            <div
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                background: "#f5f3ff",
                textAlign: "center",
                minWidth: 110,
              }}
            >
              <strong style={{ display: "block", fontSize: 32, color: "#7357ee" }}>
                {Number.isFinite(Number(item?.atsScore))
                  ? Math.round(Number(item.atsScore))
                  : Number.isFinite(Number(item?.scoreBreakdown?.overallScore))
                    ? Math.round(Number(item.scoreBreakdown.overallScore))
                    : getScore(item)}
              </strong>
              <span style={{ fontSize: 12, color: "#625d75" }}>
                ResumeIQ score / 100
              </span>
            </div>
          </div>

          {Array.isArray(item?.scoreBreakdown?.components) &&
          item.scoreBreakdown.components.length > 0 ? (
            <div style={{ display: "grid", gap: 14 }}>
              {item.scoreBreakdown.components.map((component) => (
                <div
                  key={component.key || component.label}
                  style={{
                    border: "1px solid #eceaf3",
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <strong>{component.label || "Scoring factor"}</strong>
                    <span className="muted-message">
                      {Number(component.score) || 0}% · Weight{" "}
                      {Number(component.weight) || 0}%
                    </span>
                  </div>

                  <div
                    style={{
                      height: 8,
                      borderRadius: 99,
                      background: "#efedf5",
                      overflow: "hidden",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(
                          0,
                          Math.min(100, Number(component.score) || 0)
                        )}%`,
                        background: "#7357ee",
                        borderRadius: 99,
                      }}
                    />
                  </div>

                  <p className="muted-message" style={{ marginBottom: 6 }}>
                    {component.explanation || "No explanation provided."}
                  </p>

                  {Number.isFinite(Number(component.points)) && (
                    <span style={{ fontSize: 12, fontWeight: 600 }}>
                      Contribution: {Number(component.points).toFixed(1)} points
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="info-note">
              A factor-by-factor score breakdown is not available for this
              analysis yet. The backend must return scoreBreakdown data for
              this section to display the individual scoring factors.
            </div>
          )}

          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              How is this score calculated?
            </summary>

            <div
              style={{
                marginTop: 12,
                padding: 14,
                background: "#f8f7fc",
                borderRadius: 10,
                lineHeight: 1.6,
              }}
            >
              <p>
                {item?.scoreBreakdown?.methodology ||
                  "The scoring methodology has not been provided by the backend for this analysis."}
              </p>

              <p style={{ marginBottom: 0 }}>
                <strong>Important:</strong>{" "}
                {item?.scoreBreakdown?.limitations ||
                  "ResumeIQ scores are estimates based on the implemented matching logic. They are not official ATS scores."}
              </p>
            </div>
          </details>
        </section>
        {/* End Explainable ATS Score */}

          {tabs.map((tab) => (
            <a
              key={tab}
              href={`#report-${tab.toLowerCase()}`}
              className="detail-tab"
            >
              {tab}
            </a>
          ))}
        </div>

        <section
          className="content-card report-section"
          id="report-overview"
        >
          <h2>Job match overview</h2>
          <p className="muted-message">
            Your job match score is based on the current backend
            skill-matching calculation.
          </p>

          <ProgressRow
            label="Matched job skills"
            value={
              matched.length + missing.length
                ? (matched.length / (matched.length + missing.length)) *
                  100
                : 0
            }
            color="#16b8a6"
          />

          <ProgressRow
            label="Missing job skills"
            value={
              matched.length + missing.length
                ? (missing.length / (matched.length + missing.length)) *
                  100
                : 0
            }
            color="#ef5350"
          />

          <div className="info-note">
            This report uses the scores and checks currently returned by
            your backend. Additional ATS dimensions will require separate
            scoring logic.
          </div>
        </section>

        <section
          className="content-card report-section"
          id="report-skills"
        >
          <h2>Job match analysis</h2>
          <p className="muted-message">
            Skills detected in the resume text compared with the job
            description.
          </p>

          <div className="skill-columns">
            <SkillPanel
              title={`Matched skills (${matched.length})`}
              items={matched}
              kind="matched"
            />

            <SkillPanel
              title={`Missing skills (${missing.length})`}
              items={missing}
              kind="missing"
            />
          </div>
        </section>

        <section className="report-bottom-grid">
          <div
            className="content-card report-section"
            id="report-quality"
          >
            <h2>Resume quality checks</h2>

            {Object.keys(checks).length ? (
              Object.entries(checks).map(([key, value]) => (
                <div className="check-row" key={key}>
                  <span
                    className={value ? "check-good" : "check-bad"}
                  >
                    {value ? "✓" : "!"}
                  </span>

                  <span>
                    {key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (s) => s.toUpperCase())}
                  </span>

                  <strong>
                    {value ? "Detected" : "Not detected"}
                  </strong>
                </div>
              ))
            ) : (
              <p className="muted-message">
                No quality-check details were returned for this record.
              </p>
            )}
          </div>

          <div
            className="content-card report-section"
            id="report-recommendations"
          >
            <h2>Recommendations</h2>

            {recommendations.length ? (
              <ul className="recommendation-list">
                {recommendations.map((recommendation, index) => (
                  <li key={index}>
                    <span>{index + 1}</span>
                    <p>
                      {typeof recommendation === "string"
                        ? recommendation
                        : recommendation.recommendation_text ||
                          recommendation.text ||
                          JSON.stringify(recommendation)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-message">
                No recommendations were returned for this analysis.
              </p>
            )}
          </div>
        </section>

        <section
          className="content-card report-section"
          id="report-keywords"
        >
          <h2>Keywords</h2>
          <p className="muted-message">
            The current backend checks a predefined skill list. Advanced
            keyword extraction and phrase analysis are not implemented yet.
          </p>

          <div className="keyword-tags">
            {[...matched, ...missing].map((skill, index) => (
              <span
                key={`${skill}-${index}`}
                className={`tag ${
                  matched.includes(skill) ? "tag-green" : "tag-red"
                }`}
              >
                {skill}
              </span>
            ))}

            {!matched.length && !missing.length && (
              <span className="muted-message">
                No skill keywords returned.
              </span>
            )}
          </div>
        </section>

        <section
          className="content-card report-section"
          id="report-improvements"
        >
          <h2>Improvements</h2>

          {missing.length ? (
            <ul className="simple-list">
              {missing.map((skill, index) => (
                <li key={`${skill}-${index}`}>
                  If you genuinely have experience with{" "}
                  <strong>{skill}</strong>, add relevant evidence to your
                  resume. Do not list skills you do not possess.
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-message">
              No missing skills were returned by the current matching logic.
            </p>
          )}
        </section>

        <section
          className="content-card report-section"
          id="report-interview"
        >
          <h2>Interview preparation</h2>
          <p className="muted-message">
            Suggested practice prompts based on the skill gaps in this
            report. These are rule-based prompts, not generated interview
            predictions.
          </p>

          <ul className="simple-list">
            {(missing.length ? missing.slice(0, 5) : matched.slice(0, 5))
              .map((skill, index) => (
                <li key={`${skill}-${index}`}>
                  Prepare an example or explanation demonstrating your
                  knowledge of <strong>{skill}</strong>.
                </li>
              ))}

            {!missing.length && !matched.length && (
              <li>
                Review the responsibilities and required skills in the
                original job description.
              </li>
            )}
          </ul>
        </section>

        <button
          className="btn btn-primary"
          onClick={startNewAnalysis}
        >
          Analyze another resume →
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("dashboard")}
          aria-label="ResumeIQ dashboard"
        >
          <span className="brand-mark">R</span>
          <span>
            Resume<span className="brand-accent">IQ</span>
          </span>
        </button>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="nav-list" aria-label="Main navigation">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${
                page === item.id && !selected ? "active" : ""
              }`}
              onClick={() => navigate(item.id)}
            >
              <Icon>{item.icon}</Icon>
              <span>{item.label}</span>

              {item.id === "history" && history.length > 0 && (
                <span className="nav-count">{history.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-promo">
          <div className="promo-star">✳</div>
          <h3>Build a stronger application</h3>
          <p>
            Compare your resume with your next opportunity.
          </p>
          <button onClick={startNewAnalysis}>
            Start analysis →
          </button>
        </div>

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${
              page === "settings" ? "active" : ""
            }`}
            onClick={() => navigate("settings")}
          >
            <Icon>⚙</Icon>
            <span>Settings</span>
          </button>

          <div className="user-card">
            <div className="avatar">R</div>
            <div>
              <strong>ResumeIQ User</strong>
              <span>Personal workspace</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {selected
                ? "Analysis report"
                : NAV.find((item) => item.id === page)?.label ||
                  "Settings"}
            </strong>
          </div>

          <div className="topbar-right">
            <span
              className={`connection-dot ${apiStatus}`}
              title={`Backend ${apiStatus}`}
            />

            <span className="topbar-status">
              {apiStatus === "online"
                ? "Connected"
                : apiStatus === "checking"
                  ? "Connecting"
                  : "Offline"}
            </span>

            <button
              className="topbar-avatar"
              onClick={() => navigate("settings")}
              title="Settings"
            >
              R
            </button>
          </div>
        </header>

        <div className="page-content">
          {selected ? (
            renderAnalysisDetail()
          ) : (
            <>
              {page === "dashboard" && renderDashboard()}
              {page === "analyze" && renderAnalyze()}
              {page === "resumes" && renderResumes()}
              {page === "matches" && renderMatches()}
              {page === "history" && renderHistory()}
              {page === "settings" && renderSettings()}
            </>
          )}
        </div>

        <footer className="app-footer">
          <span>ResumeIQ</span>
          <span>Resume insights for your next opportunity.</span>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-decoration">↗</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-label">{label}</span>
    </article>
  );
}

function FeatureCard({ number, title, text, onClick }) {
  return (
    <button className="feature-card" onClick={onClick}>
      <span className="feature-number">{number}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <span className="feature-link">Explore →</span>
    </button>
  );
}

function HistoryTable({ items, onOpen }) {
  return (
    <div className="table-wrap">
      <table className="history-table">
        <thead>
          <tr>
            <th>Resume / Job</th>
            <th>Match score</th>
            <th>Matched skills</th>
            <th>Missing skills</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            <tr key={getId(item) ?? `${getName(item)}-${index}`}>
              <td>
                <div className="table-primary">{getName(item)}</div>
                <div className="table-secondary">{getTitle(item)}</div>
              </td>

              <td>
                <span
                  className={`score-badge ${
                    getScore(item) >= 70 ? "good" : ""
                  }`}
                >
                  {getScore(item)}%
                </span>
              </td>

              <td>
                <span className="table-number">
                  {item.matchedSkills?.length || 0}
                </span>
              </td>

              <td>
                <span className="table-number">
                  {item.missingSkills?.length || 0}
                </span>
              </td>

              <td className="date-cell">{getDate(item)}</td>

              <td>
                <button
                  className="text-button"
                  onClick={() => onOpen(item)}
                >
                  View →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkillPanel({ title, items, kind }) {
  return (
    <div className={`skill-panel ${kind}`}>
      <h3>
        {kind === "matched" ? "✓" : "!"} {title}
      </h3>

      {items.length ? (
        <ul>
          {items.map((skill, index) => (
            <li key={`${skill}-${index}`}>
              <strong>{skill}</strong>
              <span>
                {kind === "matched"
                  ? "Detected in resume text"
                  : "Not detected by current matching logic"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {kind === "matched"
            ? "No matched skills were returned."
            : "No missing skills were returned."}
        </p>
      )}
    </div>
  );
}

export default App;