// const API_URL = process.env.NEXT_PUBLIC_API_URL;
const API_BASE = "/api";

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

    if (!res.ok) {
      const text = await res.text();
      console.error("fetchAPI non-OK response:", res.status, text.slice(0, 200));
      return { message: `Server error ${res.status}` };
    }

    return await res.json();
  } catch (err) {
    console.error("fetchAPI error:", err);
    return { message: "Network error — could not reach the server." };
  }
};