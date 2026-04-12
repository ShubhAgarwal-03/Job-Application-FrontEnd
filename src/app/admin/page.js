"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/utils/api";

async function callAI(pdfBase64, prompt) {
  const token = localStorage.getItem("token");
  const res = await fetchAPI("/ai/analyze", "POST", { pdfBase64, mimeType: "application/pdf", prompt }, token);
  if (res.result !== undefined) return res.result;
  if (res.raw !== undefined) return res.raw;
  throw new Error(res.message || "AI analysis failed");
}

function screeningPrompt(job) {
  return `You are a recruiter screening a resume against a job description.
Job title: ${job.title}
Job description: ${job.description}

Return ONLY valid JSON no markdown:
{
  "score": 85,
  "verdict": "Strong match",
  "strengths": ["point 1", "point 2"],
  "gaps": ["gap 1", "gap 2"],
  "recommendation": "One sentence for the recruiter."
}
verdict must be exactly: "Strong match", "Moderate match", or "Weak match".`;
}

function summaryPrompt() {
  return `Extract a brief professional summary from this resume.
Return ONLY valid JSON no markdown:
{
  "name": "full name",
  "currentRole": "most recent job title",
  "experience": "X years",
  "skills": ["skill1", "skill2", "skill3"],
  "education": "degree and institution",
  "summary": "2-3 sentence professional summary"
}`;
}

function ScoreBadge({ score, verdict }) {
  const color = score >= 75 ? "bg-green-100 text-green-800 border-green-300"
    : score >= 50 ? "bg-amber-100 text-amber-800 border-amber-300"
    : "bg-red-100 text-red-800 border-red-300";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border ${color}`}>
      {score}% · {verdict}
    </span>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("full-time");

  // per-application AI data keyed by app.id
  const [screening, setScreening] = useState({});
  const [summaries, setSummaries] = useState({});
  const [aiLoading, setAiLoading] = useState({});

  // resume panel
  const [resumePanel, setResumePanel] = useState(null); // { url, filename, appId }

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) { router.push("/login"); return; }
    if (role !== "admin") { router.push("/jobs"); return; }
    setAuthChecked(true);
    fetchApplications(token);
    fetchJobs(token);
  }, []);

  const fetchApplications = async (token) => {
    try {
      const t = token || localStorage.getItem("token");
      const data = await fetchAPI("/applications", "GET", null, t);
      if (data.message) throw new Error(data.message);
      const apps = Array.isArray(data) ? data : [];
      setApplications(apps);
      // auto-run screening for all pending apps that have a resume
      apps.forEach((app) => {
        if (app.resume?.id && app.job?.description) {
          runAIForApp(app);
        }
      });
    } catch (e) {
      setLoadError(`Failed to load applications: ${e.message}`);
    }
  };

  const fetchJobs = async (token) => {
    try {
      const t = token || localStorage.getItem("token");
      const data = await fetchAPI("/jobs?limit=100", "GET", null, t);
      if (data.message) throw new Error(data.message);
      setJobs(data.jobs || []);
    } catch (e) {
      setLoadError(`Failed to load jobs: ${e.message}`);
    }
  };

  // Runs both screening and summary for one application
  const runAIForApp = useCallback(async (app) => {
    if (!app.resume?.id || !app.job?.description) return;
    const appId = app.id;

    setAiLoading((prev) => ({ ...prev, [appId]: true }));
    try {
      const token = localStorage.getItem("token");
      const resumeDoc = await fetchAPI(`/resumes/${app.resume.id}`, "GET", null, token);
      if (!resumeDoc.data) return;

      // run both in parallel
      const [screenResult, summaryResult] = await Promise.allSettled([
        callAI(resumeDoc.data, screeningPrompt(app.job)),
        callAI(resumeDoc.data, summaryPrompt()),
      ]);

      if (screenResult.status === "fulfilled") {
        setScreening((prev) => ({ ...prev, [appId]: screenResult.value }));
      }
      if (summaryResult.status === "fulfilled") {
        setSummaries((prev) => ({ ...prev, [appId]: summaryResult.value }));
      }
    } catch (e) {
      console.error("[Admin AI] Error for app", appId, e.message);
    } finally {
      setAiLoading((prev) => ({ ...prev, [appId]: false }));
    }
  }, []);

  const openResumePanel = async (app) => {
    const token = localStorage.getItem("token");
    const data = await fetchAPI(`/resumes/${app.resume.id}`, "GET", null, token);
    if (!data.data) return alert("Could not load resume.");
    const bytes = atob(data.data);
    const arr = new Uint8Array(bytes.length).map((_, i) => bytes.charCodeAt(i));
    const blob = new Blob([arr], { type: "application/pdf" });
    setResumePanel({
      url: URL.createObjectURL(blob),
      filename: app.resume.filename,
      appId: app.id,
      summary: summaries[app.id],
    });
  };

  const createJob = async () => {
    if (!title || !company || !description) return alert("Please fill all fields.");
    const token = localStorage.getItem("token");
    const res = await fetchAPI("/jobs", "POST", { title, company, description, type }, token);
    alert(res.message);
    setTitle(""); setCompany(""); setDescription(""); setType("full-time");
    fetchJobs();
  };

  const deleteJob = async (jobId) => {
    if (!confirm("Delete this job? This cannot be undone.")) return;
    const token = localStorage.getItem("token");
    const res = await fetchAPI(`/jobs/${jobId}`, "DELETE", null, token);
    alert(res.message);
    fetchJobs();
  };

  const updateStatus = async (id, status) => {
    const token = localStorage.getItem("token");
    const res = await fetchAPI(`/applications/${id}`, "PUT", { status }, token);
    alert(res.message);
    fetchApplications();
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  const scoreColor = (score) => {
    if (score >= 75) return "text-green-800 bg-green-50 border-green-200";
    if (score >= 50) return "text-amber-800 bg-amber-50 border-amber-200";
    return "text-red-800 bg-red-50 border-red-200";
  };

  if (!authChecked) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl">Admin Dashboard</h1>
        <button onClick={logout} className="text-sm text-gray-500 border px-3 py-1 rounded hover:bg-gray-50">Logout</button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">
          {loadError}
          <button onClick={() => { setLoadError(""); fetchApplications(); fetchJobs(); }} className="ml-3 underline">Retry</button>
        </div>
      )}

      {/* Create Job */}
      <div className="mb-8 border p-4 rounded-lg">
        <h2 className="text-lg font-medium mb-3">Create Job</h2>
        <div className="flex flex-wrap gap-2">
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="border p-2 rounded flex-1 min-w-28" />
          <input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} className="border p-2 rounded flex-1 min-w-28" />
          <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="border p-2 rounded flex-1 min-w-48" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="border p-2 rounded">
            <option value="full-time">Full-Time</option>
            <option value="part-time">Part-Time</option>
            <option value="internship">Internship</option>
          </select>
          <button onClick={createJob} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Create</button>
        </div>
      </div>

      {/* Jobs */}
      <h2 className="text-lg font-medium mb-2">All Jobs ({jobs.length})</h2>
      {jobs.length === 0 && !loadError && <p className="text-sm text-gray-500 mb-6">No jobs yet.</p>}
      <div className="mb-8">
        {jobs.map((job) => (
          <div key={job.id} className="border p-3 mb-2 rounded flex justify-between items-center">
            <div>
              <p className="font-medium">{job.title}</p>
              <p className="text-sm text-gray-500">{job.company} · {job.type}</p>
            </div>
            <button onClick={() => deleteJob(job.id)} className="bg-red-500 text-white px-2 py-1 text-sm rounded hover:bg-red-600">Delete</button>
          </div>
        ))}
      </div>

      {/* Applications */}
      <h2 className="text-lg font-medium mb-2">Applications ({applications.length})</h2>
      {applications.length === 0 && !loadError && <p className="text-gray-500 text-sm">No applications yet.</p>}

      {applications.map((app) => {
        const sc = screening[app.id];
        const sm = summaries[app.id];
        const loading = aiLoading[app.id];

        return (
          <div key={app.id} className="border rounded-lg p-4 mb-4">
            {/* Top row — applicant info + score badge */}
            <div className="flex justify-between items-start gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold">{app.job?.title}</h3>
                  <span className="text-gray-400 text-sm">·</span>
                  <span className="text-sm text-gray-500">{app.job?.company}</span>
                  {sc && <ScoreBadge score={sc.score} verdict={sc.verdict} />}
                  {loading && <span className="text-xs text-purple-600 animate-pulse">Analysing...</span>}
                </div>
                <p className="text-sm mt-1">
                  <span className="text-gray-500">Applicant: </span>
                  <span className="font-medium">{app.user?.name}</span>
                  <span className="text-gray-400"> · {app.user?.email}</span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-500">Status: </span>
                  <span className={`font-medium ${app.status === "accepted" ? "text-green-700" : app.status === "rejected" ? "text-red-700" : "text-amber-700"}`}>
                    {app.status}
                  </span>
                </p>
              </div>

              {/* Resume button */}
              {app.resume && (
                <button
                  onClick={() => openResumePanel(app)}
                  className="text-xs bg-blue-100 text-blue-800 px-3 py-1.5 rounded hover:bg-blue-200 shrink-0"
                >
                  View resume + summary
                </button>
              )}
            </div>

            {/* AI summary inline */}
            {sm && !loading && (
              <div className="bg-gray-50 border rounded p-3 mb-3 text-sm">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-2">
                  {sm.currentRole && <><span className="text-gray-500">Role</span><span>{sm.currentRole}</span></>}
                  {sm.experience && <><span className="text-gray-500">Experience</span><span>{sm.experience}</span></>}
                  {sm.education && <><span className="text-gray-500">Education</span><span>{sm.education}</span></>}
                </div>
                {sm.skills?.length > 0 && (
                  <p className="mb-1"><span className="text-gray-500">Skills: </span>{sm.skills.join(", ")}</p>
                )}
                {sm.summary && <p className="text-gray-600 italic text-xs mt-1">{sm.summary}</p>}
              </div>
            )}

            {/* Screening detail */}
            {sc && !loading && (
              <div className={`border rounded p-3 mb-3 text-sm ${scoreColor(sc.score)}`}>
                {sc.strengths?.length > 0 && <p className="mb-1"><span className="font-medium">Strengths: </span>{sc.strengths.join("; ")}</p>}
                {sc.gaps?.length > 0 && <p className="mb-1"><span className="font-medium">Gaps: </span>{sc.gaps.join("; ")}</p>}
                {sc.recommendation && <p className="italic mt-1">{sc.recommendation}</p>}
              </div>
            )}

            {/* Accept / Reject */}
            <div className="flex gap-2">
              <button disabled={app.status !== "pending"} onClick={() => updateStatus(app.id, "accepted")}
                className={`px-3 py-1 text-sm text-white rounded ${app.status !== "pending" ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"}`}>
                Accept
              </button>
              <button disabled={app.status !== "pending"} onClick={() => updateStatus(app.id, "rejected")}
                className={`px-3 py-1 text-sm text-white rounded ${app.status !== "pending" ? "bg-gray-400 cursor-not-allowed" : "bg-red-500 hover:bg-red-600"}`}>
                Reject
              </button>
            </div>
          </div>
        );
      })}

      {/* Resume + Summary side-by-side panel */}
      {resumePanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setResumePanel(null); }}>
          <div className="bg-white rounded-xl w-full mx-4 flex flex-col" style={{ maxWidth: "900px", height: "88vh" }}>
            <div className="flex justify-between items-center p-4 border-b">
              <p className="font-medium text-sm">{resumePanel.filename}</p>
              <button onClick={() => setResumePanel(null)} className="text-sm text-gray-500 hover:text-gray-800">Close</button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {/* PDF */}
              <iframe src={resumePanel.url} className="flex-1 border-r" title="Resume" />
              {/* Summary panel */}
              <div className="w-72 p-4 overflow-y-auto text-sm">
                <p className="font-medium mb-3 text-purple-700">Resume summary</p>
                {resumePanel.summary ? (
                  <div className="flex flex-col gap-2">
                    {resumePanel.summary.name && <div><span className="text-gray-500 block text-xs">Name</span>{resumePanel.summary.name}</div>}
                    {resumePanel.summary.currentRole && <div><span className="text-gray-500 block text-xs">Role</span>{resumePanel.summary.currentRole}</div>}
                    {resumePanel.summary.experience && <div><span className="text-gray-500 block text-xs">Experience</span>{resumePanel.summary.experience}</div>}
                    {resumePanel.summary.education && <div><span className="text-gray-500 block text-xs">Education</span>{resumePanel.summary.education}</div>}
                    {resumePanel.summary.skills?.length > 0 && (
                      <div><span className="text-gray-500 block text-xs mb-1">Skills</span>
                        <div className="flex flex-wrap gap-1">
                          {resumePanel.summary.skills.map((s) => (
                            <span key={s} className="bg-purple-50 text-purple-800 border border-purple-200 text-xs px-2 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {resumePanel.summary.summary && (
                      <div><span className="text-gray-500 block text-xs">Summary</span><p className="italic text-gray-600">{resumePanel.summary.summary}</p></div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs">Summary loading or unavailable.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}