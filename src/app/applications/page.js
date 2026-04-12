"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/utils/api";
import { isLoggedIn } from "@/utils/auth";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const data = await fetchAPI("/applications/my", "GET", null, token);
      if (!Array.isArray(data)) {
        throw new Error(data.message || "Unexpected response from server");
      }
      setApplications(data);
    } catch (e) {
      setError(e.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  const statusColor = (status) => {
    if (status === "accepted") return "text-green-700 bg-green-50 border-green-200";
    if (status === "rejected") return "text-red-700 bg-red-50 border-red-200";
    return "text-amber-700 bg-amber-50 border-amber-200";
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl">My Applications</h1>
        <div className="flex gap-2">
          <a href="/jobs" className="text-sm text-gray-500 border px-3 py-1 rounded hover:bg-gray-50">Browse jobs</a>
          <button onClick={logout} className="text-sm text-gray-500 border px-3 py-1 rounded hover:bg-gray-50">Logout</button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">
          {error} <button onClick={fetchApplications} className="ml-2 underline">Retry</button>
        </div>
      )}

      {!loading && !error && applications.length === 0 && (
        <p className="text-gray-500 text-sm">No applications yet. <a href="/jobs" className="text-blue-500 underline">Browse jobs</a> to get started.</p>
      )}

      {applications.map((app) => (
        <div key={app.id} className="border p-4 mb-3 rounded shadow">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold">{app.job?.title}</h2>
              <p className="text-sm text-gray-500">{app.job?.company}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded border ${statusColor(app.status)}`}>
              {app.status}
            </span>
          </div>
          {app.resume && (
            <p className="text-xs text-gray-400 mt-2">Resume: {app.resume.filename}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Applied {new Date(app.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}