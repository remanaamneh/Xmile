/*********************************
 * CONFIG
 *********************************/
const API_BASE = window.API_BASE || "";
const EVENTS_URL = `${API_BASE}/events`;
const AUTH_ME_URL = `${API_BASE}/auth/me`;
const AC_BASE = `${API_BASE}/attendance`;

/*********************************
 * UTIL
 *********************************/
const getToken = () => localStorage.getItem("token");

function authHeaders() {
  const t = getToken();
  return {
    "Authorization": "Bearer " + t,
    "Content-Type": "application/json"
  };
}

function logout() {
  localStorage.clear();
  window.location.href = "/select-role.html";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[s]));
}

function normalizeText(s){ return (s || "").toString().toLowerCase().trim(); }

/*********************************
 * STATE
 *********************************/
let events = [];
let participants = [];
let selectedEventId = null;

let searchQuery = "";

/*********************************
 * INIT
 *********************************/
document.addEventListener("DOMContentLoaded", async () => {
  if (!getToken()) {
    alert("אנא התחבר תחילה");
    window.location.href = "/login.html";
    return;
  }

  initUserMenu();
  bindComposeInputs();

  await loadUserInfo();
  await loadEvents();

  // Default: pick first event
  if (events.length) {
    selectedEventId = events[0].id;
    document.getElementById("acEventSelect").value = String(selectedEventId);
    await refreshParticipants();
  } else {
    renderEmpty("No events found.");
  }
});

/*********************************
 * USER MENU
 *********************************/
function initUserMenu() {
  const btn = document.getElementById("xmUserMenuBtn");
  const dd = document.getElementById("xmUserDropdown");
  if (!btn || !dd) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dd.classList.toggle("show");
  });
  document.addEventListener("click", () => dd.classList.remove("show"));
  dd.addEventListener("click", (e) => e.stopPropagation());

  const s = document.getElementById("xmSearch");
  if (s) {
    s.addEventListener("input", (e) => {
      searchQuery = e.target.value || "";
      renderTable();
    });
  }
}

/*********************************
 * LOAD USER
 *********************************/
async function loadUserInfo() {
  const t = getToken();
  let username = "Client", email = "—";

  // try token
  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    if (payload?.email) email = payload.email;
    if (payload?.name) username = payload.name;
    else if (payload?.email) username = payload.email.split("@")[0];
  } catch(e){}

  // try server: /auth/me
  try {
    const res = await fetch(AUTH_ME_URL, { headers: { "Authorization": "Bearer " + t } });
    if (res.ok) {
      const me = await res.json();
      if (me?.name) username = me.name;
      if (me?.email) email = me.email;
    }
  } catch(e){}

  const chip = (username || "CL").slice(0,2).toUpperCase();

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set("xmUserLabel", username);
  set("xmUserChip", chip);
  set("xmUserInitials", chip);
  set("xmUserNameMini", username);
  set("xmUserEmailMini", email);
}

/*********************************
 * COMPOSE BINDINGS
 *********************************/
function bindComposeInputs() {
  const msg = document.getElementById("acMessage");
  const cc = document.getElementById("acCharCount");
  if (msg && cc) {
    msg.addEventListener("input", () => {
      cc.textContent = String(Math.min(500, msg.value.length));
      if (msg.value.length > 500) msg.value = msg.value.slice(0, 500);
    });
  }

  const sel = document.getElementById("acEventSelect");
  if (sel) {
    sel.addEventListener("change", async (e) => {
      selectedEventId = parseInt(e.target.value, 10);
      await refreshParticipants();
    });
  }

  const btn = document.getElementById("acSendPendingBtn");
  if (btn) btn.addEventListener("click", sendToAllPending);
}

/*********************************
 * LOAD EVENTS
 *********************************/
async function loadEvents() {
  const sel = document.getElementById("acEventSelect");
  if (!sel) return;

  sel.innerHTML = `<option value="">Loading...</option>`;

  const res = await fetch(EVENTS_URL, { headers: authHeaders() });

  if (res.status === 401) { alert("פג תוקף ההתחברות"); logout(); return; }
  if (!res.ok) { sel.innerHTML = `<option value="">Failed</option>`; return; }

  const data = await res.json();
  events = Array.isArray(data) ? data : [];

  if (!events.length) {
    sel.innerHTML = `<option value="">No events</option>`;
    return;
  }

  sel.innerHTML = events.map(ev => {
    const name = ev.name || `Event #${ev.id}`;
    return `<option value="${ev.id}">${escapeHtml(name)}</option>`;
  }).join("");
}

/*********************************
 * PARTICIPANTS
 *********************************/
async function refreshParticipants() {
  if (!selectedEventId) return;

  const tbody = document.getElementById("acTbody");
  if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="text-muted">Loading...</td></tr>`;

  const res = await fetch(`${AC_BASE}/events/${selectedEventId}/participants`, { headers: authHeaders() });

  if (res.status === 401) { alert("פג תוקף ההתחברות"); logout(); return; }
  if (!res.ok) { renderEmpty("Failed to load participants."); return; }

  const data = await res.json();
  participants = Array.isArray(data) ? data : [];

  renderStats();
  renderTable();
}

/*********************************
 * STATS
 *********************************/
function statusUpper(p){ return (p?.status || "PENDING").toString().toUpperCase(); }

function computeCounts(list) {
  const c = { PENDING:0, SENT:0, VIEWED:0, CONFIRMED:0, DECLINED:0, FAILED:0 };
  list.forEach(p => {
    const s = statusUpper(p);
    if (c[s] !== undefined) c[s] += 1;
    else c.PENDING += 1;
  });
  return c;
}

function renderStats() {
  const c = computeCounts(participants);
  const total = participants.length || 0;
  const confirmed = c.CONFIRMED || 0;

  const rate = total ? Math.round((confirmed / total) * 100) : 0;

  setText("acRate", `${rate}%`);
  setText("acConfirmedNum", confirmed);
  setText("acTotalNum", total);

  setText("acPendingNum", c.PENDING);
  setText("acSentNum", c.SENT);
  setText("acViewedNum", c.VIEWED);
  setText("acConfirmedNum2", c.CONFIRMED);
  setText("acDeclinedNum", c.DECLINED);
  setText("acFailedNum", c.FAILED);

  const fill = document.getElementById("acBarFill");
  if (fill) fill.style.width = `${rate}%`;

  setText("acPendingCountBtn", c.PENDING);

  const btn = document.getElementById("acSendPendingBtn");
  if (btn) btn.disabled = (c.PENDING === 0);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(val);
}

/*********************************
 * TABLE RENDER
 *********************************/
function renderEmpty(msg) {
  const tbody = document.getElementById("acTbody");
  if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="text-muted">${escapeHtml(msg)}</td></tr>`;
}

function channelPill(ch) {
  const u = (ch || "").toUpperCase();
  if (u === "EMAIL") return `<span class="ac-pill email"><i class="fas fa-envelope"></i> Email</span>`;
  if (u === "SMS") return `<span class="ac-pill sms"><i class="fas fa-message"></i> SMS</span>`;
  if (u === "WHATSAPP") return `<span class="ac-pill wa"><i class="fab fa-whatsapp"></i> WhatsApp</span>`;
  return "";
}

function renderTable() {
  const tbody = document.getElementById("acTbody");
  if (!tbody) return;

  const q = normalizeText(searchQuery);

  const filtered = participants.filter(p => {
    if (!q) return true;
    const hay = normalizeText(`${p.fullName || ""} ${p.email || ""} ${p.phone || ""} ${statusUpper(p)}`);
    return hay.includes(q);
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted">No matching participants.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const name = escapeHtml(p.fullName || "—");
    const email = escapeHtml(p.email || "—");
    const channels = Array.isArray(p.channelsUsed) ? p.channelsUsed : [];
    const status = statusUpper(p);

    const channelsHtml = channels.length
      ? channels.map(channelPill).join(" ")
      : `<span class="text-muted">Not sent</span>`;

    const badge = `<span class="ac-badge ${status}">${status}</span>`;

    const actions = buildActions(p);

    return `
      <tr>
        <td>
          <div style="font-weight:900">${name}</div>
          <div class="text-muted" style="font-size:13px">${email}</div>
        </td>
        <td>${channelsHtml}</td>
        <td>${badge}</td>
        <td class="text-end">${actions}</td>
      </tr>
    `;
  }).join("");
}

function buildActions(p) {
  const s = statusUpper(p);

  const confirmBtn = `
    <button class="ac-btn ok" onclick="manualConfirm(${p.id})">
      <i class="fas fa-check"></i> Confirm
    </button>
  `;

  const retryBtn = `
    <button class="ac-btn retry" onclick="retrySend(${p.id})">
      <i class="fas fa-rotate-right"></i> Retry
    </button>
  `;

  if (s === "FAILED") return `<div class="ac-actions">${confirmBtn}${retryBtn}</div>`;
  if (s === "PENDING" || s === "SENT" || s === "VIEWED") return `<div class="ac-actions">${confirmBtn}</div>`;
  return `<div class="ac-actions"></div>`;
}

/*********************************
 * ACTIONS — API CALLS
 *********************************/
function selectedChannels() {
  const ch = [];
  if (document.getElementById("acChEmail")?.checked) ch.push("EMAIL");
  if (document.getElementById("acChSms")?.checked) ch.push("SMS");
  if (document.getElementById("acChWa")?.checked) ch.push("WHATSAPP");
  return ch;
}

async function sendToAllPending() {
  if (!selectedEventId) return;

  const channels = selectedChannels();
  if (!channels.length) { alert("בחר לפחות ערוץ אחד"); return; }

  const message = (document.getElementById("acMessage")?.value || "").trim();
  if (!message) { alert("כתוב הודעה לשליחה"); return; }

  const btn = document.getElementById("acSendPendingBtn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Sending...`; }

  try {
    const res = await fetch(`${AC_BASE}/confirmations/send`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ eventId: selectedEventId, message, channels, audience: "PENDING" })
    });

    if (res.status === 401) { alert("פג תוקף ההתחברות"); logout(); return; }
    if (!res.ok) {
      const txt = await res.text().catch(()=> "");
      throw new Error(txt || "Failed to send confirmations");
    }

    await refreshParticipants();
  } catch (e) {
    alert("שגיאה: " + e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-paper-plane"></i> Send to All Pending (<span id="acPendingCountBtn">0</span>)`;
      const c = computeCounts(participants);
      setText("acPendingCountBtn", c.PENDING);
      btn.disabled = (c.PENDING === 0);
    }
  }
}

window.manualConfirm = async function(participantId) {
  if (!confirm("לאשר את המשתתף כ-Confirmed?")) return;

  const res = await fetch(`${AC_BASE}/participants/${participantId}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status: "CONFIRMED" })
  });

  if (res.status === 401) { alert("פג תוקף ההתחברות"); logout(); return; }
  if (!res.ok) { alert("שגיאה בעדכון סטטוס"); return; }

  await refreshParticipants();
};

window.retrySend = async function(participantId) {
  const channels = selectedChannels();
  if (!channels.length) { alert("בחר לפחות ערוץ אחד"); return; }

  const message = (document.getElementById("acMessage")?.value || "").trim();
  if (!message) { alert("כתוב הודעה לשליחה"); return; }

  const res = await fetch(`${AC_BASE}/confirmations/retry`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ participantId, eventId: selectedEventId, message, channels })
  });

  if (res.status === 401) { alert("פג תוקף ההתחברות"); logout(); return; }
  if (!res.ok) { alert("שגיאה בשליחה חוזרת"); return; }

  await refreshParticipants();
};
