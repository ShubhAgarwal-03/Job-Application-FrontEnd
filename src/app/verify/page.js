"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchAPI } from "@/utils/api";

// Must be in a separate component because useSearchParams requires Suspense
function VerifyContent() {
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please use the link from your email.");
      return;
    }
    verifyToken(token);
  }, []);

  const verifyToken = async (token) => {
    try {
      const data = await fetchAPI(`/auth/verify/${token}`, "GET");
      if (data.message?.toLowerCase().includes("verified")) {
        setStatus("success");
        setMessage("Your email has been verified. Redirecting to login...");
        setTimeout(() => router.push("/login"), 2500);
      } else {
        setStatus("error");
        setMessage(data.message || "Verification failed. The link may have expired.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-sm text-center">
        {status === "verifying" && (
          <>
            <div className="flex justify-center mb-4">
              <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Verifying your email...</h2>
          </>
        )}
        {status === "success" && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Email verified!</h2>
            <p className="text-sm text-gray-500">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Verification failed</h2>
            <p className="text-sm text-gray-500 mb-4">{message}</p>
            <a href="/signup" className="text-blue-600 text-sm hover:underline">Back to signup</a>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Loading...</h2>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}