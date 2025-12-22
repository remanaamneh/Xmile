/*********************************
 * CONFIG
 * Note: API_BASE is loaded from config.js
 *********************************/
// API_BASE is defined in config.js (loaded before this file)
const EVENTS_URL = `${API_BASE}/events`;

/*********************************
 * UTILITIES
 *********************************/
const getToken = () => localStorage.getItem("token");

const formatDate = (dateString) => {
    if (!dateString) return "לא זמין";
    const d = new Date(dateString);
    if (isNaN(d)) return "לא זמין";
    return d.toLocaleDateString("he-IL", { year: "numeric", month: "short", day: "numeric" });
};

const getStatusText = (status) => {
    const statusMap = {
        "DRAFT": "טיוטה",
        "ACTIVE": "פעיל",
        "CONFIRMED": "מאושר",
        "CANCELLED": "בוטל",
        "COMPLETED": "הושלם"
    };
    return statusMap[status] || status;
};

const formatInputDate = (dateString) => {
    if (!dateString) return "";
    return dateString.substring(0, 10);
};

/*********************************
 * INIT (DOM READY)
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
    // Check if user is authenticated
    if (!getToken()) {
        alert("אנא התחבר תחילה");
        window.location.href = "/login.html";
        return;
    }

    // Check user role and redirect if needed
    checkUserRoleAndRedirect();

    initEventForm();
    fetchAndRenderEvents();
    updateStats();
    loadUserInfo();
});

/*********************************
 * ROLE CHECK & REDIRECT
 *********************************/
function checkUserRoleAndRedirect() {
    const token = getToken();
    if (!token) return;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const role = payload.role || payload.roles?.[0];
        
        // If user is CLIENT, redirect to client dashboard
        if (role === 'CLIENT' || role === 'ROLE_CLIENT') {
            if (!window.location.pathname.includes('client-dashboard')) {
                window.location.href = '/client-dashboard.html';
                return;
            }
        }
        // If user is ADMIN, stay on admin dashboard
    } catch (err) {
        console.error("Error checking role:", err);
    }
}

/*********************************
 * AUTH
 *********************************/
function logout() {
    localStorage.clear();
    window.location.href = "/login.html";
}

/*********************************
 * USER INFO
 *********************************/
async function loadUserInfo() {
    const token = getToken();
    if (!token) return;

    try {
        // Decode JWT to get user info (simple base64 decode)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userNameEl = document.getElementById("userName");
        if (userNameEl && payload.sub) {
            // Try to get user name from token or use email
            userNameEl.textContent = payload.email || payload.sub || "משתמש";
        }
    } catch (err) {
        console.error("Error loading user info:", err);
    }
}

/*********************************
 * STATS
 *********************************/
async function updateStats() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(EVENTS_URL, {
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (res.ok) {
            const events = await res.json();
            const activeEvents = events.filter(e => e.status === "ACTIVE" || e.status === "CONFIRMED").length;
            
            document.getElementById("activeEventsCount").textContent = activeEvents || 0;
            document.getElementById("totalParticipantsCount").textContent = 
                events.reduce((sum, e) => sum + (e.participantCount || 0), 0) || 0;
            document.getElementById("confirmationsCount").textContent = 
                events.filter(e => e.status === "CONFIRMED").length || 0;
        }
    } catch (err) {
        console.error("Error updating stats:", err);
    }
}

/*********************************
 * AI ASSISTANT
 *********************************/
function handleAIRequest(type) {
    const requests = {
        quote: "צור הצעת מחיר מקצועית לאירוע",
        reminder: "צור תזכורת מקצועית למשתתפים",
        invitation: "צור הזמנה מעוצבת לאירוע",
        summary: "צור סיכום ביצועי אירוע"
    };
    
    document.getElementById("aiCustomRequest").value = requests[type] || "";
    alert("פיצ'ר AI יושם בקרוב!");
}

function handleCustomAIRequest() {
    const request = document.getElementById("aiCustomRequest").value;
    if (!request.trim()) {
        alert("אנא הזן בקשה");
        return;
    }
    alert("פיצ'ר AI יושם בקרוב!");
}

function toggleChat() {
    alert("צ'אט יושם בקרוב!");
}

/*********************************
 * EVENTS
 *********************************/
async function fetchAndRenderEvents() {
    const tbody = document.getElementById("eventsTableBody");
    if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="6" class="text-center">טוען אירועים...</td></tr>`;

    const token = getToken();
    if (!token) {
        alert("Please login first");
        window.location.href = "/index.html";
        return;
    }

    try {
        const res = await fetch(EVENTS_URL, {
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (res.status === 401) {
            alert("Session expired. Please login again.");
            logout();
            return;
        }

        if (!res.ok) {
            throw new Error("Failed to fetch events");
        }

        const events = await res.json();
        tbody.innerHTML = "";

        if (!events.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center">לא נמצאו אירועים. צור את האירוע הראשון שלך!</td></tr>`;
            return;
        }

        events.forEach(ev => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td><strong>${ev.name || "N/A"}</strong></td>
                <td>${formatDate(ev.eventDate)}</td>
                <td>${ev.description ? (ev.description.length > 50 ? ev.description.substring(0, 50) + "..." : ev.description) : ""}</td>
                <td>
                    ${ev.contactName ? `<strong>${ev.contactName}</strong><br>` : ""}
                    ${ev.contactEmail ? `<small>${ev.contactEmail}</small><br>` : ""}
                    ${ev.contactPhone ? `<small>${ev.contactPhone}</small>` : ""}
                    ${!ev.contactName && !ev.contactEmail && !ev.contactPhone ? "N/A" : ""}
                </td>
                <td><span class="badge bg-info">${getStatusText(ev.status || "DRAFT")}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editEvent(${ev.id})">ערוך</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEvent(${ev.id})">מחק</button>
                </td>
            `;
        });

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error: ${err.message}</td></tr>`;
        console.error(err);
    }
}

/*********************************
 * EVENT FORM
 *********************************/
function initEventForm() {
    const eventForm = document.getElementById("eventForm");
    if (eventForm) {
        eventForm.addEventListener("submit", handleEventSubmit);
    }
}

function clearForm() {
    document.getElementById("eventId").value = "";
    document.getElementById("eventName").value = "";
    document.getElementById("eventScheduledDate").value = "";
    document.getElementById("eventDescription").value = "";
    document.getElementById("contactName").value = "";
    document.getElementById("contactEmail").value = "";
    document.getElementById("contactPhone").value = "";
    document.getElementById("eventModalLabel").textContent = "צור אירוע חדש";
}

async function handleEventSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("eventId").value;
    const name = document.getElementById("eventName").value;
    const date = document.getElementById("eventScheduledDate").value;
    const description = document.getElementById("eventDescription").value;
    const contactName = document.getElementById("contactName").value;
    const contactEmail = document.getElementById("contactEmail").value;
    const contactPhone = document.getElementById("contactPhone").value;

    const payload = {
        name: name,
        description: description,
        location: "TBD", // Default location
        eventDate: date,
        startTime: "10:00:00", // Default start time
        participantCount: 0, // Default participant count
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null
    };

    const token = getToken();
    if (!token) {
        alert("Please login first");
        window.location.href = "/index.html";
        return;
    }

    try {
        const url = id ? `${EVENTS_URL}/${id}` : EVENTS_URL;
        const method = id ? "PUT" : "POST";

        const res = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(payload)
        });

        if (res.status === 401) {
            alert("Session expired. Please login again.");
            logout();
            return;
        }

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || "Failed to save event");
        }

        // Close modal and refresh events
        if (window.bootstrap) {
            const modalEl = document.getElementById("eventModal");
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal?.hide();
        }

        fetchAndRenderEvents();
        updateStats();
        e.target.reset();
    } catch (err) {
        alert("Error: " + err.message);
        console.error(err);
    }
}

async function editEvent(id) {
    const token = getToken();
    if (!token) {
        alert("Please login first");
        window.location.href = "/index.html";
        return;
    }

    try {
        const res = await fetch(`${EVENTS_URL}/${id}`, {
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (res.status === 401) {
            alert("Session expired. Please login again.");
            logout();
            return;
        }

        if (!res.ok) {
            throw new Error("Failed to fetch event");
        }

        const ev = await res.json();
        
        document.getElementById("eventId").value = ev.id;
        document.getElementById("eventName").value = ev.name || "";
        document.getElementById("eventScheduledDate").value = formatInputDate(ev.eventDate);
        document.getElementById("eventDescription").value = ev.description ? ev.description.split("\n\nContact:")[0] : "";
        document.getElementById("contactName").value = ev.contactName || "";
        document.getElementById("contactEmail").value = ev.contactEmail || "";
        document.getElementById("contactPhone").value = ev.contactPhone || "";
        document.getElementById("eventModalLabel").textContent = "ערוך אירוע";

        if (window.bootstrap) {
            const modalEl = document.getElementById("eventModal");
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }
    } catch (err) {
        alert("Error: " + err.message);
        console.error(err);
    }
}

async function deleteEvent(id) {
    if (!confirm("האם אתה בטוח שברצונך למחוק את האירוע הזה?")) {
        return;
    }

    const token = getToken();
    if (!token) {
        alert("Please login first");
        window.location.href = "/index.html";
        return;
    }

    try {
        const res = await fetch(`${EVENTS_URL}/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (res.status === 401) {
            alert("Session expired. Please login again.");
            logout();
            return;
        }

        if (!res.ok) {
            throw new Error("Failed to delete event");
        }

        fetchAndRenderEvents();
    } catch (err) {
        alert("Error: " + err.message);
        console.error(err);
    }
}

