/*********************************
 * CONFIG
 *********************************/
const API_BASE = window.API_BASE || "";
const EVENTS_URL = `${API_BASE}/events`;
const CLIENT_QUOTE_REQUESTS_URL = `${API_BASE}/client/quote-requests`;

const getToken = () => localStorage.getItem("token");

/*********************************
 * HELPERS
 *********************************/
const $ = (id) => document.getElementById(id);

function esc(s) {
  return (s ?? "").toString().replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" });
}

function moneyUSD(x) {
  if (x == null || x === "") return "—";
  const n = Number(x);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 });
}

function normalize(s){ return (s ?? "").toString().toLowerCase().trim(); }

/*********************************
 * STATE
 *********************************/
let merged = [];        // unified rows for table
let filtered = [];      // after search+filter
let menuCtx = null;     // which row is open in actions menu

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
 * DATA FETCH (REAL)
 *********************************/
async function apiGet(url) {
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    }
  });
  if (res.status === 401) {
    alert("Session expired. Please login again.");
    logout();
    return null;
  }
  return res;
}

async function loadEventsData() {
  const token = getToken();
  if (!token) {
    alert("Please login first");
    window.location.href = "/login.html";
    return;
  }

  $("eventsTbody").innerHTML = `
    <tr><td colspan="6"><div class="xm-loading"><i class="fas fa-spinner fa-spin"></i> Loading events...</div></td></tr>
  `;

  try {
    const [eventsRes, quotesRes] = await Promise.all([
      apiGet(EVENTS_URL),
      apiGet(CLIENT_QUOTE_REQUESTS_URL),
    ]);

    if (!eventsRes || !quotesRes) return;

    const eventsData = eventsRes.ok ? await eventsRes.json() : [];
    const quotesData = quotesRes.ok ? await quotesRes.json() : [];

    const events = Array.isArray(eventsData) ? eventsData : [];
    const quotes = Array.isArray(quotesData) ? quotesData : [];

    // Merge by eventId (quote.eventId) and event.id
    const map = new Map();

    events.forEach(ev => {
      map.set(ev.id, { event: ev, quote: null });
    });

    quotes.forEach(q => {
      const k = q.eventId;
      if (!map.has(k)) map.set(k, { event: null, quote: q });
      else map.get(k).quote = q;
    });

    merged = Array.from(map.values()).map(x => toRowModel(x));
    applyFilters();

  } catch (e) {
    console.error(e);
    $("eventsTbody").innerHTML = `
      <tr><td colspan="6"><div class="text-danger p-3">Failed to load events</div></td></tr>
    `;
  }
}

function toRowModel(x) {
  const ev = x.event;
  const q  = x.quote;

  const id = ev?.id ?? q?.eventId ?? null;
  const name = ev?.name ?? q?.eventName ?? "Untitled event";
  const location = ev?.location ?? q?.location ?? "";
  const date = ev?.eventDate ?? q?.eventDate ?? null;

  const participantsTotal = ev?.participantCount ?? q?.participantCount ?? 0;
  // אם יש לך confirmedCount אמיתי בעתיד - נכניס פה, כרגע 0
  const participantsConfirmed = ev?.confirmedCount ?? 0;

  const price = q?.finalPrice ?? q?.quoteAmount ?? q?.price ?? ev?.estimatedPrice ?? null;

  // Status mapping
  const rawStatus = (q?.status ?? ev?.status ?? "DRAFT").toString().toUpperCase();
  const status = mapStatus(rawStatus);

  return {
    id,
    name,
    location,
    date,
    participantsConfirmed,
    participantsTotal,
    price,
    status,      // { key, label, className }
    raw: x
  };
}

function mapStatus(s) {
  // התאמה למה שמופיע בתמונה
  if (["APPROVED","CONFIRMED","CLIENT_APPROVED","ACTIVE"].includes(s))
    return { key:"ACTIVE", label:"Active", className:"xm-badge active" };

  if (["QUOTE_PENDING","PENDING_APPROVAL","SENT_TO_MANAGER","MANAGER_REVIEW","SUBMITTED","PENDING_CLIENT_FINAL"].includes(s))
    return { key:"PENDING", label:"Pending Approval", className:"xm-badge pending" };

  if (["COMPLETED"].includes(s))
    return { key:"COMPLETED", label:"Completed", className:"xm-badge completed" };

  return { key:"DRAFT", label:"Draft", className:"xm-badge draft" };
}

/*********************************
 * SEARCH + FILTER
 *********************************/
function applyFilters() {
  const q1 = normalize($("eventsSearch")?.value);
  const q2 = normalize($("eventsTopSearch")?.value);
  const query = q1 || q2 || "";

  const st = $("statusFilter")?.value || "ALL";

  filtered = merged.filter(r => {
    const hay = normalize(`${r.name} ${r.location} ${r.status.label} ${r.status.key}`);
    const okQuery = !query || hay.includes(query);
    const okStatus = (st === "ALL") || (r.status.key === st);
    return okQuery && okStatus;
  });

  renderTable();
}

/*********************************
 * ACTIONS
 *********************************/
function openActionsMenu(anchorEl, row) {
  const menu = $("actionsMenu");
  if (!menu) return;

  menuCtx = row;
  const rect = anchorEl.getBoundingClientRect();
  menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
  menu.style.left = `${rect.right + window.scrollX - 180}px`;
  menu.classList.add("show");
  menu.setAttribute("aria-hidden", "false");
}

function closeActionsMenu() {
  const menu = $("actionsMenu");
  if (!menu) return;
  menu.classList.remove("show");
  menu.setAttribute("aria-hidden", "true");
  menuCtx = null;
}

async function deleteEventReal(row) {
  // DELETE /events/id/{eventId}
  if (!row?.id) return alert("Missing event id");

  const ok = confirm(`Delete "${row.name}"? This cannot be undone.`);
  if (!ok) return;

  const token = getToken();
  try {
    const res = await fetch(`${EVENTS_URL}/id/${row.id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token }
    });

    if (res.status === 401) { logout(); return; }
    if (!res.ok) {
      const t = await res.text().catch(()=> "");
      throw new Error(t || "Failed to delete");
    }

    await loadEventsData();
  } catch (e) {
    console.error(e);
    alert("Delete failed: " + e.message);
  }
}

/*********************************
 * RENDER
 *********************************/
function renderTable() {
  $("eventsCount").textContent = `${filtered.length} events`;

  if (filtered.length === 0) {
    $("eventsTbody").innerHTML = `
      <tr>
        <td colspan="6">
          <div class="p-4 text-center text-muted">No events found</div>
        </td>
      </tr>
    `;
    return;
  }

  $("eventsTbody").innerHTML = filtered.map(r => `
    <tr class="xm-row">
      <td>
        <div class="xm-evcell">
          <div class="xm-evicon"><i class="fas fa-calendar"></i></div>
          <div>
            <div class="xm-evname">${esc(r.name)}</div>
            <div class="xm-evsub"><i class="fas fa-map-marker-alt"></i> ${esc(r.location || "—")}</div>
          </div>
        </div>
      </td>

      <td>
        <div class="xm-date"><i class="far fa-clock"></i> ${formatDate(r.date)}</div>
      </td>

      <td>
        <div class="xm-part">
          <i class="fas fa-users"></i>
          <span>${r.participantsConfirmed}</span> / <span>${r.participantsTotal}</span>
        </div>
      </td>

      <td>${moneyUSD(r.price)}</td>

      <td><span class="${r.status.className}">${r.status.label}</span></td>

      <td class="text-end">
        ${r.status.key === "DRAFT" ? `<button class="btn btn-outline-success btn-sm me-2" data-submit="${r.id}">Submit</button>` : ``}
        <button class="xm-dots" data-actions="${r.id}" title="Actions"><i class="fas fa-ellipsis-v"></i></button>
      </td>
    </tr>
  `).join("");

  // attach listeners
  document.querySelectorAll("[data-actions]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = Number(btn.getAttribute("data-actions"));
      const row = filtered.find(x => x.id === id);
      if (!row) return;
      openActionsMenu(btn, row);
    });
  });

  document.querySelectorAll("[data-submit]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = Number(btn.getAttribute("data-submit"));
      window.location.href = `/quote-request.html?eventId=${id}`;
    });
  });
}

/*********************************
 * INIT
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
  if (!getToken()) {
    alert("Please login first");
    window.location.href = "/login.html";
    return;
  }

  initUserMenu();

  // Search bindings
  $("eventsSearch")?.addEventListener("input", applyFilters);
  $("eventsTopSearch")?.addEventListener("input", applyFilters);
  $("statusFilter")?.addEventListener("change", applyFilters);

  // Create event
  $("btnCreateEvent")?.addEventListener("click", () => {
    window.location.href = "/quote-request.html";
  });

  // Actions menu handlers
  $("actionsMenu")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const row = menuCtx;
    closeActionsMenu();

    if (!row) return;

    if (action === "view") {
      alert(`Event: ${row.name}\nDate: ${formatDate(row.date)}\nLocation: ${row.location || "—"}`);
      return;
    }

    if (action === "participants") {
      window.location.href = `/participants.html?eventId=${row.id}`;
      return;
    }

    if (action === "attendance") {
      window.location.href = `/attendance-confirmation.html?eventId=${row.id}`;
      return;
    }

    if (action === "delete") {
      await deleteEventReal(row);
      return;
    }
  });

  // close menu on outside click/scroll
  document.addEventListener("click", closeActionsMenu);
  window.addEventListener("scroll", closeActionsMenu, { passive: true });

  // load
  loadEventsData();
});
