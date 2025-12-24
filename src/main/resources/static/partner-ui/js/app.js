/*********************************
 * 1. CONFIG
 * Note: API_BASE is loaded from config.js
 *********************************/
// API_BASE is defined in config.js (loaded before this file)
// For partner-ui, we use /api prefix
// If API_BASE is empty (relative URLs), use /api directly
const PARTNER_API_BASE = API_BASE ? (API_BASE.includes('localhost') ? API_BASE + '/api' : API_BASE) : '/api';
const AUTH_URL = `${PARTNER_API_BASE}/auth`;
const EVENTS_URL = `${PARTNER_API_BASE}/events`;
const REVIEWS_URL = `${PARTNER_API_BASE}/reviews`;

/*********************************
 * 2. GLOBAL STATE
 *********************************/
let loginModal, registerModal, eventModal;

/*********************************
 * 3. UTILITIES
 *********************************/
const getToken = () => localStorage.getItem("token");

const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    return isNaN(d)
        ? "N/A"
        : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatInputDate = (dateString) =>
    dateString ? dateString.substring(0, 10) : "";

/*********************************
 * 4. INIT (DOM READY)
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
    initModals();
    initAuthForms();
    initPublicForms();

    if (document.getElementById("eventsTableBody")) {
        requireAuth();
        fetchAndRenderEvents();
    }

    if (document.getElementById("testimonialCarousel")) {
        loadTestimonials();
    }
});

/*********************************
 * 5. MODALS
 *********************************/
function initModals() {
    const map = [
        ["loginModal", (m) => (loginModal = m)],
        ["registerModal", (m) => (registerModal = m)],
        ["eventModal", (m) => (eventModal = m)]
    ];

    map.forEach(([id, setter]) => {
        const el = document.getElementById(id);
        if (el && window.bootstrap) {
            setter(new bootstrap.Modal(el));
        }
    });
}

/*********************************
 * 6. AUTH
 *********************************/
function requireAuth() {
    if (!getToken()) {
        alert("Please login first");
        window.location.replace("index.html");
    }
}

function logout() {
    localStorage.clear();
    window.location.replace("index.html");
}

function initAuthForms() {
    const registerForm = document.getElementById("registerForm");
    const loginForm = document.getElementById("loginForm");

    registerForm?.addEventListener("submit", handleRegister);
    loginForm?.addEventListener("submit", handleLogin);
}

async function handleRegister(e) {
    e.preventDefault();

    const payload = {
        fullName: registerName.value,
        email: registerEmail.value,
        password: registerPassword.value
    };

    try {
        const res = await fetch(`${AUTH_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(await res.text());

        alert("Registration successful. Please login.");
        registerModal?.hide();
        loginModal?.show();
        e.target.reset();
    } catch (err) {
        alert(err.message);
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const payload = {
        email: loginUsername.value,
        password: loginPassword.value
    };

    try {
        const res = await fetch(`${AUTH_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Invalid credentials");

        const { token } = await res.json();
        localStorage.setItem("token", token);
        window.location.href = "dashboard.html";
    } catch (err) {
        alert(err.message);
    }
}

/*********************************
 * 7. EVENTS (DASHBOARD)
 *********************************/
async function fetchAndRenderEvents() {
    const tbody = document.getElementById("eventsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="text-center">Loading...</td></tr>`;

    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please login first");
        window.location.href = "index.html"; // redirect to login
        return;
    }

    try {
        const res = await fetch(`${EVENTS_URL}`, {
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) throw new Error("Unauthorized or session expired");

        const events = await res.json();
        tbody.innerHTML = "";

        if (!events.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center">No events found</td></tr>`;
            return;
        }

        events.forEach(ev => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td><strong>${ev.name}</strong></td>
                <td>${formatDate(ev.scheduledDate)}</td>
                <td>${ev.description || ""}</td>
                <td>
                    <strong>${ev.contactName || "N/A"}</strong><br>
                    <small>${ev.contactEmail || ""}</small><br>
                    <small>${ev.contactPhone || ""}</small>
                </td>
                <td><span class="badge bg-info">${ev.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editEvent(${ev.id})">Edit</button>
                    <button class="btn btn-sm btn-secondary" onclick="closeEvent(${ev.id})">Close</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEvent(${ev.id})">Delete</button>
                </td>
            `;
        });

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">${err.message}</td></tr>`;
        console.error(err);
    }
}

/*********************************
 * 8. EVENT FORM
 *********************************/
document.getElementById("eventForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = eventId.value;
    const payload = {
        name: eventName.value,
        scheduledDate: eventScheduledDate.value,
        description: eventDescription.value || ""
    };

    const url = id ? `${EVENTS_URL}/${id}` : EVENTS_URL;
    const method = id ? "PUT" : "POST";

    await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
    });

    eventModal?.hide();
    fetchAndRenderEvents();
});

async function editEvent(id) {
    const res = await fetch(`${EVENTS_URL}/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
    });

    const ev = await res.json();
    eventId.value = ev.id;
    eventName.value = ev.name;
    eventScheduledDate.value = formatInputDate(ev.scheduledDate);
    eventModal?.show();
}

async function closeEvent(id) {
    if (!confirm("Close this event?")) return;
    await fetch(`${EVENTS_URL}/${id}/close`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}` }
    });
    fetchAndRenderEvents();
}

async function deleteEvent(id) {
    if (!confirm("Delete this event?")) return;
    await fetch(`${EVENTS_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` }
    });
    fetchAndRenderEvents();
}

/*********************************
 * 9. PUBLIC FORMS
 *********************************/
function initPublicForms() {
    reachUsForm?.addEventListener("submit", submitReachUs);
    reviewForm?.addEventListener("submit", submitReview);
}

async function submitReachUs(e) {
    e.preventDefault();

    const payload = {
        contactName: guestName.value,
        contactEmail: guestEmail.value,
        contactPhone: guestPhone.value,
        name: reachEventName.value,
        scheduledDate: reachEventDate.value,
        description: reachDescription.value
    };

    const res = await fetch(`${EVENTS_URL}/public/reach-us`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert("Inquiry sent!");
        bootstrap.Modal.getInstance(reachUsModal)?.hide();
        e.target.reset();
    }
}

/*********************************
 * 10. REVIEWS
 *********************************/
async function loadTestimonials() {
    const res = await fetch(`${REVIEWS_URL}/latest`);
    const reviews = await res.json();
    const inner = document.querySelector("#testimonialCarousel .carousel-inner");

    if (!inner || !reviews.length) return;

    inner.innerHTML = reviews
        .map(
            (r, i) => `
            <div class="carousel-item ${i === 0 ? "active" : ""}">
                <p class="h4">"${r.reviewText}"</p>
                <small>- ${r.clientName}</small>
            </div>
        `
        )
        .join("");
}

async function submitReview(e) {
    e.preventDefault();

    const payload = {
        clientName: reviewerName.value,
        reviewText: reviewText.value
    };

    const res = await fetch(REVIEWS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert("Review submitted!");
        bootstrap.Modal.getInstance(reviewModal)?.hide();
        loadTestimonials();
    }
}
