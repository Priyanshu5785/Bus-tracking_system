export const SERVER = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(SERVER + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
