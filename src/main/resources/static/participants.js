/*********************************
 * CONFIG
 *********************************/
const API_BASE = window.API_BASE || "";
const EVENTS_URL = `${API_BASE}/events`;
const PARTICIPANTS_URL = `${API_BASE}/participants`;

const getToken = () => localStorage.getItem("token");

/*********************************
 * HELPERS
 *********************************/
const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[s]));
}

function normalize(s) {
  return (s ?? "").toString().toLowerCase().trim();
}

function statusBadge(s) {
  const st = (s || "").toUpperCase();
  if (st === "CONFIRMED") return "bg-success-subtle text-success border border-success-subtle";
  if (st === "VIEWED") return "bg-warning-subtle text-warning border border-warning-subtle";
  if (st === "PENDING" || st === "SENT") return "bg-primary-subtle text-primary border-primary-subtle";
  if (st === "DECLINED" || st === "FAILED") return "bg-danger-subtle text-danger border border-danger-subtle";
  return "bg-secondary-subtle text-secondary border border-secondary-subtle";
}

function setText(id, v) { const el = $(id); if (el) el.textContent = v; }

function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/*********************************
 * AUTH + USER MENU
 *********************************/
function logout() {
  localStorage.clear();
  window.location.href = "/select-role.html";
}

function initUserMenu() {
  const btn = $("xmUserMenuBtn");
  const dd  = $("xmUserDropdown");
  if (!btn || !dd) return;

  btn.addEventListener("click", (e) => { e.stopPropagation(); dd.classList.toggle("show"); });
  document.addEventListener("click", () => dd.classList.remove("show"));

  $("btnLogout")?.addEventListener("click", logout);
  $("btnSettings")?.addEventListener("click", () => alert("Settings page (TODO)"));
}

/*********************************
 * API
 *********************************/
async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    "Authorization": "Bearer " + token,
  };

  // JSON only if not multipart
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    alert("Session expired. Please login again.");
    logout();
    throw new Error("401");
  }
  return res;
}

/*********************************
 * LOAD EVENTS DROPDOWN
 *********************************/
async function loadEventsDropdown() {
  try {
    const res = await apiFetch(EVENTS_URL);
    if (!res.ok) throw new Error("Failed events");
    const events = await res.json();
    const sel = $("pEventFilter");
    if (!sel) return;

    sel.innerHTML = `<option value="">All Events</option>` + (events || [])
      .map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`)
      .join("");
  } catch (e) {
    console.error("loadEventsDropdown error:", e);
  }
}

/*********************************
 * LOAD PARTICIPANTS
 *********************************/
async function loadParticipants() {
  const q = $("pSearch")?.value?.trim() || "";
  const eventId = $("pEventFilter")?.value || "";
  const status = $("pStatusFilter")?.value || "";

  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (eventId) params.append("eventId", eventId);
  if (status) params.append("status", status);

  try {
    const res = await apiFetch(`${PARTICIPANTS_URL}?${params.toString()}`);
    if (!res.ok) throw new Error("Failed participants");
    const data = await res.json();

    renderStats(data);
    renderTable(data);
  } catch (e) {
    console.error("loadParticipants error:", e);
    const tbody = $("pTbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Failed to load participants</td></tr>`;
    }
  }
}

function renderStats(list) {
  const total = list?.length || 0;
  const count = (s) => (list || []).filter(p => (p.status || "").toUpperCase() === s).length;

  setText("kTotal", total);
  setText("kConfirmed", count("CONFIRMED"));
  setText("kViewed", count("VIEWED"));
  setText("kPending", count("PENDING"));
  setText("kDeclined", count("DECLINED") + count("FAILED"));
}

function renderTable(list) {
  const tbody = $("pTbody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No participants found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr>
      <td>
        <div class="fw-semibold">${escapeHtml(p.fullName || p.name || "-")}</div>
        <div class="text-muted small">${escapeHtml(p.role || "")}</div>
      </td>
      <td class="small">
        <div><i class="fa-regular fa-envelope me-1"></i>${escapeHtml(p.email || "-")}</div>
        <div><i class="fa-solid fa-phone me-1"></i>${escapeHtml(p.phone || "-")}</div>
      </td>
      <td>${escapeHtml(p.company || "-")}</td>
      <td>${escapeHtml(p.eventName || (p.event?.name) || "-")}</td>
      <td><span class="badge ${statusBadge(p.status)}">${escapeHtml(p.status || "PENDING")}</span></td>
    </tr>
  `).join("");
}

/*********************************
 * UPLOAD
 *********************************/
async function uploadExcel(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await apiFetch(`${PARTICIPANTS_URL}/upload`, {
      method: "POST",
      body: fd
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert("Upload failed: " + txt);
      return;
    }

    alert("File uploaded successfully");
    e.target.value = "";
    loadParticipants();
  } catch (err) {
    console.error(err);
    alert("Upload error");
  }
}

/*********************************
 * INIT
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
  if (!getToken()) {
    window.location.href = "/login.html";
    return;
  }

  initUserMenu();

  loadEventsDropdown();
  loadParticipants();

  $("pSearch")?.addEventListener("input", debounce(loadParticipants, 300));
  $("pEventFilter")?.addEventListener("change", loadParticipants);
  $("pStatusFilter")?.addEventListener("change", loadParticipants);

  $("fileUpload")?.addEventListener("change", uploadExcel);
});
