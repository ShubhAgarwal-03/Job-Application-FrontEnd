const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const fetchAPI = async (endpoint, method = "GET", body = null, token = null) => {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    const data = await res.json().catch(() => ({
      message: `Server error ${res.status}`,
    }));

    return data;
  } catch (err) {
    console.error("fetchAPI error:", err);
    return { message: "Network error — could not reach the server." };
  }
};