"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchAPI } from "@/utils/api";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/utils/auth";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function callAI(pdfBase64, prompt) {
  const token = localStorage.getItem("token");
  const res = await fetchAPI("/ai/analyze", "POST", { pdfBase64, mimeType: "application/pdf", prompt }, token);
  if (res.result !== undefined) return res.result;
  if (res.raw !== undefined) return res.raw;
  throw new Error(res.message || "AI analysis failed");
}

const AUTOFILL_PROMPT = `Extract structured information from this resume.
Return ONLY valid JSON no markdown fences, no explanation. Empty string if not found:
{
  "name": "full name",
  "email": "email address",
  "phone": "phone number",
  "skills": ["skill1", "skill2"],
  "experience": "X years",
  "currentRole": "most recent job title",
  "education": "highest degree and institution",
  "summary": "2-sentence professional summary"
}`;

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);  // ids of saved jobs
  const [type, setType] = useState("all");
  const [keyword, setKeyword] = useState("");

  const [myResumes, setMyResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");

  const [applyModalJob, setApplyModalJob] = useState(null);
  const [useNewResume, setUseNewResume] = useState(false);
  const [newResumeFile, setNewResumeFile] = useState(null);
  const [autofillData, setAutofillData] = useState(null);
  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState("");
  const [applying, setApplying] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [applyError, setApplyError] = useState("");

  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    fetchMyResumes();
    fetchSavedJobs();
    fetchAppliedJobs();
  }, []);

  // Single effect handles both filter reset and fetch
  // currentPage is computed here so the fetch always uses the right value
  useEffect(() => {
    if (!isLoggedIn()) return;
    const delay = setTimeout(() => fetchJobs(page), 300);
    return () => clearTimeout(delay);
  }, [page, keyword, type]);

  // Reset page when filters change — separate effect so page resets before fetch
  useEffect(() => {
    setPage(1);
  }, [keyword, type]);

  const fetchJobs = async (currentPage = 1) => {
    const token = localStorage.getItem("token");
    const data = await fetchAPI(
      `/jobs?page=${currentPage}&limit=5&keyword=${encodeURIComponent(keyword)}&type=${type}`,
      "GET", null, token
    );
    setJobs(data.jobs || []);
    setTotalPages(data.totalPages || 1);
  };

  const fetchAppliedJobs = async () => {
    const token = localStorage.getItem("token");
    const data = await fetchAPI("/applications/my", "GET", null, token);
    const ids = Array.isArray(data)
      ? data.map((app) => app.job?._id?.toString() || app.job?.id?.toString()).filter(Boolean)
      : [];
    setAppliedJobs(ids);
  };

  const fetchSavedJobs = async () => {
    const token = localStorage.getItem("token");
    const data = await fetchAPI("/saved", "GET", null, token);
    if (Array.isArray(data)) {
      setSavedJobs(data.map((s) => s.id?.toString()));
    }
  };

  const toggleSave = async (jobId) => {
    const token = localStorage.getItem("token");
    const res = await fetchAPI(`/saved/${jobId}`, "POST", null, token);
    if (res.saved === true) {
      setSavedJobs((prev) => [...prev, jobId.toString()]);
    } else {
      setSavedJobs((prev) => prev.filter((id) => id !== jobId.toString()));
    }
  };

  const fetchMyResumes = async () => {
    const token = localStorage.getItem("token");
    const data = await fetchAPI("/resumes/my", "GET", null, token);
    if (Array.isArray(data)) {
      setMyResumes(data);
      if (data.length > 0) setSelectedResumeId(data[0].id);
    }
  };

  const uploadResume = async (file) => {
    setUploadingResume(true);
    try {
      const base64 = await fileToBase64(file);
      const token = localStorage.getItem("token");
      const res = await fetchAPI("/resumes/upload", "POST",
        { filename: file.name, data: base64, mimeType: file.type || "application/pdf" }, token);
      await fetchMyResumes();
      return res.resume?.id;
    } finally {
      setUploadingResume(false);
    }
  };

  const runAutofillFromSaved = useCallback(async (resumeId) => {
    if (!resumeId) return;
    setAutofilling(true);
    setAutofillData(null);
    setAutofillError("");
    try {
      const token = localStorage.getItem("token");
      const doc = await fetchAPI(`/resumes/${resumeId}`, "GET", null, token);
      if (!doc.data) throw new Error("Resume data not found.");
      const result = await callAI(doc.data, AUTOFILL_PROMPT);
      setAutofillData(result);
    } catch (e) {
      setAutofillError(e.message || "Could not read resume.");
    } finally {
      setAutofilling(false);
    }
  }, []);

  const runAutofillFromFile = useCallback(async (file) => {
    if (!file) return;
    setAutofilling(true);
    setAutofillData(null);
    setAutofillError("");
    try {
      const base64 = await fileToBase64(file);
      const result = await callAI(base64, AUTOFILL_PROMPT);
      setAutofillData(result);
    } catch (e) {
      setAutofillError(e.message || "Could not read resume.");
    } finally {
      setAutofilling(false);
    }
  }, []);

  const openApplyModal = (job) => {
    setApplyModalJob(job);
    setAutofillData(null);
    setAutofillError("");
    setApplyError("");
    setNewResumeFile(null);
    if (myResumes.length === 0) {
      setUseNewResume(true);              // No saved resumes — force upload flow, no autofill yet
    } else {
      setUseNewResume(false);             // Has saved resumes — default to first one and autofill immediately
      runAutofillFromSaved(myResumes[0].id);
    }
  };

  const submitApplication = async () => {
    if (!applyModalJob) return;
    setApplying(true);
    setApplyError("");
    try {
      let resumeId = selectedResumeId;
      if (useNewResume) {
        if (!newResumeFile) { setApplyError("Please select a resume file."); return; }
        resumeId = await uploadResume(newResumeFile);
        if (!resumeId) { setApplyError("Resume upload failed."); return; }
      }
      const token = localStorage.getItem("token");
      const res = await fetchAPI(`/applications/${applyModalJob.id}`, "POST", { resumeId }, token);
      if (res.message === "Applied successfully") {
        setAppliedJobs((prev) => [...prev, applyModalJob.id?.toString()]);
        setApplyModalJob(null);
      } else {
        setApplyError(res.message || "Something went wrong.");
      }
    } finally {
      setApplying(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl">Jobs</h1>
        <div className="flex gap-2">
          <a href="/saved" className="text-sm text-blue-600 border border-blue-200 px-3 py-1 rounded hover:bg-blue-50">Saved jobs</a>
          <a href="/applications" className="text-sm text-gray-500 border px-3 py-1 rounded hover:bg-gray-50">My applications</a>
          <button onClick={logout} className="text-sm text-gray-500 border px-3 py-1 rounded hover:bg-gray-50">Logout</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          placeholder="Search jobs..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="border p-2 flex-1 rounded"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="border p-2 rounded">
          <option value="all">All types</option>
          <option value="full-time">Full-Time</option>
          <option value="part-time">Part-Time</option>
          <option value="internship">Internship</option>
        </select>
      </div>

      {jobs.length === 0 && <p className="text-gray-500 text-sm">No jobs found.</p>}

      {jobs.map((job) => {
        const alreadyApplied = appliedJobs.includes(job.id?.toString());
        const isSaved = savedJobs.includes(job.id?.toString());
        return (
          <div key={job.id} className="border p-4 mb-3 rounded shadow">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold">{job.title}</h2>
                <p className="text-sm text-gray-500">{job.company} · {job.type}</p>
              </div>
              <button
                onClick={() => toggleSave(job.id)}
                className={`text-xs px-2 py-1 rounded border ${isSaved ? "bg-blue-50 text-blue-700 border-blue-300" : "text-gray-400 border-gray-200 hover:border-gray-400"}`}
                title={isSaved ? "Unsave" : "Save for later"}
              >
                {isSaved ? "Saved" : "Save"}
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">{job.description}</p>
            <button
              onClick={() => openApplyModal(job)}
              disabled={alreadyApplied}
              className={`px-3 py-1 mt-3 text-white rounded text-sm ${
                alreadyApplied ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {alreadyApplied ? "Applied" : "Apply"}
            </button>
          </div>
        );
      })}

      <div className="mt-4 flex gap-2 items-center">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50">Prev</button>
        <span className="text-sm">Page {page} of {totalPages}</span>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50">Next</button>
      </div>

      {/* Apply modal */}
      {applyModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setApplyModalJob(null); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl overflow-y-auto" style={{ maxHeight: "90vh" }}>
            <h2 className="text-xl font-semibold mb-1">Apply — {applyModalJob.title}</h2>
            <p className="text-sm text-gray-500 mb-4">{applyModalJob.company}</p>

            <p className="font-medium text-sm mb-2">Resume</p>

            {/* Saved resume picker */}
            {myResumes.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={!useNewResume}
                    onChange={() => { setUseNewResume(false); setAutofillData(null); setAutofillError(""); runAutofillFromSaved(selectedResumeId); }} />
                  Use a saved resume
                </label>
                {!useNewResume && (
                  <div className="ml-5">
                    <select value={selectedResumeId}
                      onChange={(e) => { setSelectedResumeId(e.target.value); setAutofillData(null); runAutofillFromSaved(e.target.value); }}
                      className="border p-1 text-sm rounded w-full">
                      {myResumes.map((r) => (
                        <option key={r.id} value={r.id}>{r.filename} — {new Date(r.createdAt).toLocaleDateString()}</option>
                      ))}
                    </select>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={useNewResume}
                    onChange={() => { setUseNewResume(true); setAutofillData(null); setAutofillError(""); setNewResumeFile(null); }} />
                  Upload a different resume for this job
                </label>
              </div>
            )}

            {/* File upload area */}
            {(useNewResume || myResumes.length === 0) && (
              <div className="mb-3 flex flex-col gap-2">
                {myResumes.length === 0 && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    You need to upload a resume before applying.
                  </p>
                )}
                <input type="file" accept=".pdf" className="text-sm"
                  onChange={(e) => { const f = e.target.files[0]; if (!f) return; setNewResumeFile(f); runAutofillFromFile(f); }} />
              </div>
            )}

             {/* Autofill status */}
            {autofilling && (
              <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded p-3 mb-3">
                <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Reading your resume...
              </div>
            )}

            {autofillError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">{autofillError}</p>}

            {/* Autofill result — shown automatically, no button needed */}
            {autofillData && !autofilling && (
              <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-4 text-sm">
                <p className="font-medium mb-2 text-purple-700">Extracted from your resume</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {[["Name","name"],["Email","email"],["Phone","phone"],["Experience","experience"],["Current role","currentRole"],["Education","education"]].map(([label, key]) =>
                    autofillData[key] ? (
                      <span key={label} className="contents">
                        <span className="text-gray-500">{label}</span>
                        <span>{autofillData[key]}</span>
                      </span>
                    ) : null
                  )}
                </div>
                {autofillData.skills?.length > 0 && <p className="mt-2"><span className="text-gray-500">Skills: </span>{autofillData.skills.join(", ")}</p>}
                {autofillData.summary && <p className="mt-2 text-gray-600 italic">{autofillData.summary}</p>}
              </div>
            )}

            {applyError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">{applyError}</p>}

            <div className="flex gap-2 justify-end mt-2">
              <button onClick={() => setApplyModalJob(null)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={submitApplication}
                disabled={applying || uploadingResume || autofilling || (useNewResume && !newResumeFile)}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50">
                {applying || uploadingResume ? "Submitting..." : "Submit application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}