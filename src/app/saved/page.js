"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/utils/api";
import { isLoggedIn } from "@/utils/auth";

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    fetchSaved();
  }, []);

  const fetchSaved = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const data = await fetchAPI("/saved", "GET", null, token);
      setSavedJobs(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const unsave = async (jobId) => {
    const token = localStorage.getItem("token");
    await fetchAPI(`/saved/${jobId}`, "POST", null, token);
    setSavedJobs((prev) => prev.filter((j) => j.id?.toString() !== jobId.toString()));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl">Saved Jobs</h1>
        <div className="flex gap-2">
          <a href="/jobs" className="text-sm text-gray-500 border px-3 py-1 rounded hover:bg-gray-50">Browse jobs</a>
          <button onClick={logout} className="text-sm text-gray-500 border px-3 py-1 rounded hover:bg-gray-50">Logout</button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {!loading && savedJobs.length === 0 && (
        <p className="text-gray-500 text-sm">No saved jobs yet. <a href="/jobs" className="text-blue-500 underline">Browse jobs</a> and hit Save on any listing.</p>
      )}

      {savedJobs.map((job) => (
        <div key={job.id} className="border p-4 mb-3 rounded shadow">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold">{job.title}</h2>
              <p className="text-sm text-gray-500">{job.company} · {job.type}</p>
              <p className="text-sm text-gray-600 mt-1">{job.description}</p>
            </div>
            <button onClick={() => unsave(job.id)} className="text-xs text-red-500 border border-red-200 px-2 py-1 rounded hover:bg-red-50 shrink-0 ml-3">
              Remove
            </button>
          </div>
          <a href="/jobs" className="inline-block mt-3 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">
            Apply
          </a>
        </div>
      ))}
    </div>
  );
}