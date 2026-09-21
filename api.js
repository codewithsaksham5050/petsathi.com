// Change this if your backend runs somewhere else.
const API_BASE = window.location.origin.includes("5500")
  ? "http://localhost:5000/api" // when opened via a static dev server (e.g. Live Server on 5500)
  : "/api"; // when the frontend is served BY the backend itself (recommended)

function getToken() {
  return localStorage.getItem("petsath_token");
}
function getUser() {
  const raw = localStorage.getItem("petsath_user");
  return raw ? JSON.parse(raw) : null;
}
function setSession(token, user) {
  localStorage.setItem("petsath_token", token);
  localStorage.setItem("petsath_user", JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem("petsath_token");
  localStorage.removeItem("petsath_user");
}

async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  if (!(options.body instanceof FormData) && options.body) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(API_BASE + path, { ...options, headers });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    /* no body */
  }
  if (!res.ok) {
    throw new Error((data && data.message) || "Something went wrong");
  }
  return data;
}

function fileUrl(relativePath) {
  if (!relativePath) return "";
  if (relativePath.startsWith("http")) return relativePath;
  const origin = API_BASE.startsWith("http") ? API_BASE.replace("/api", "") : window.location.origin;
  return origin + relativePath;
}

const api = { apiFetch, getToken, getUser, setSession, clearSession, fileUrl };
