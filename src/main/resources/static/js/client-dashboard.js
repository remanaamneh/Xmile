/*********************************
 * CONFIG
 * Note: API_BASE is loaded from config.js
 *********************************/
// API_BASE is defined in config.js (loaded before this file)
const EVENTS_URL = `${API_BASE}/events`;
const QUOTES_URL = `${API_BASE}/quotes`;
const MESSAGES_URL = `${API_BASE}/messages`;
const CLIENT_QUOTE_REQUESTS_URL = `${API_BASE}/client/quote-requests`;

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

const formatTime = (timeString) => {
    if (!timeString) return "";
    return timeString.substring(0, 5);
};

const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('he-IL');
};

/*********************************
 * INIT (DOM READY)
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
    if (!getToken()) {
        alert("אנא התחבר תחילה");
        window.location.href = "/login.html";
        return;
    }

    loadUserInfo();
    
    // Check if we need to refresh events (e.g., after approving a quote)
    const shouldRefresh = sessionStorage.getItem('refreshEvents');
    const justApproved = sessionStorage.getItem('justApprovedQuote');
    
    console.log("=== DASHBOARD INIT ===");
    console.log("shouldRefresh:", shouldRefresh);
    console.log("justApproved:", justApproved);
    
    if (shouldRefresh === 'true' || justApproved === 'true') {
        sessionStorage.removeItem('refreshEvents');
        sessionStorage.removeItem('justApprovedQuote');
        console.log("Will refresh events after delay");
        // Small delay to ensure page is fully loaded, then refresh
        setTimeout(() => {
            console.log("Fetching events after approval...");
            fetchEvents();
            // Also switch to "pending" filter to show the newly approved quote
            if (justApproved === 'true') {
                setTimeout(() => {
                    console.log("Switching to pending filter...");
                    filterEvents('pending');
                }, 1500);
            }
        }, 500);
    } else {
        fetchEvents();
    }
    
    console.log("=== END DASHBOARD INIT ===");
    
    loadProductionCompanies();
    
    // Setup quote form
    const quoteForm = document.getElementById('quoteForm');
    if (quoteForm) {
        quoteForm.addEventListener('submit', handleQuoteSubmit);
    }
    
    // Setup button event listeners
    const quoteBtn = document.getElementById('quoteBtn');
    if (quoteBtn) {
        quoteBtn.addEventListener('click', openQuoteModal);
    }
    
    const messageBtn = document.getElementById('messageBtn');
    if (messageBtn) {
        messageBtn.addEventListener('click', openMessageModal);
    }
    
    // Setup representatives form
    const representativesForm = document.getElementById('representativesForm');
    if (representativesForm) {
        representativesForm.addEventListener('submit', handleRepresentativesSubmit);
    }
    
    console.log('Client dashboard initialized');
});

/*********************************
 * AUTH
 *********************************/
function logout() {
    localStorage.clear();
    window.location.href = "/select-role.html";
}

async function approveFinalQuote(quoteId) {
    if (!confirm('האם אתה בטוח שברצונך לאשר את ההצעה הסופית?')) {
        return;
    }
    
    const token = getToken();
    if (!token) {
        alert('אנא התחבר תחילה');
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const response = await fetch(`${CLIENT_QUOTE_REQUESTS_URL}/${quoteId}/approve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'שגיאה באישור ההצעה' }));
            throw new Error(error.message || 'שגיאה באישור ההצעה');
        }
        
        alert('ההצעה אושרה בהצלחה!');
        
        // Refresh events list
        await fetchEvents();
        
    } catch (error) {
        console.error('Error approving final quote:', error);
        alert('שגיאה באישור ההצעה: ' + error.message);
    }
}

async function rejectFinalQuote(quoteId) {
    if (!confirm('האם אתה בטוח שברצונך לדחות את ההצעה הסופית?')) {
        return;
    }
    
    const token = getToken();
    if (!token) {
        alert('אנא התחבר תחילה');
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const response = await fetch(`${CLIENT_QUOTE_REQUESTS_URL}/${quoteId}/reject`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'שגיאה בדחיית ההצעה' }));
            throw new Error(error.message || 'שגיאה בדחיית ההצעה');
        }
        
        alert('ההצעה נדחתה.');
        
        // Refresh events list
        await fetchEvents();
        
    } catch (error) {
        console.error('Error rejecting final quote:', error);
        alert('שגיאה בדחיית ההצעה: ' + error.message);
    }
}

async function sendToManager(quoteId) {
    if (!confirm('האם אתה בטוח שברצונך לשלוח את הבקשה למנהל לאישור?')) {
        return;
    }
    
    const token = getToken();
    if (!token) {
        alert('אנא התחבר תחילה');
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const response = await fetch(`${CLIENT_QUOTE_REQUESTS_URL}/${quoteId}/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'שגיאה בשליחת הבקשה' }));
            throw new Error(error.message || 'שגיאה בשליחת הבקשה');
        }
        
        const updatedQuote = await response.json();
        console.log('=== QUOTE SENT TO MANAGER ===');
        console.log('Updated quote:', updatedQuote);
        console.log('Quote status:', updatedQuote.status);
        console.log('=== END ===');
        
        // Show success message
        alert('הבקשה נשלחה למנהל בהצלחה!');
        
        // Clear current quotes and events to force refresh
        currentQuotes = [];
        currentEvents = [];
        
        // Refresh events list - this will fetch fresh data from server
        await fetchEvents();
        
        // Wait a bit for the data to be processed, then switch to pending filter
        setTimeout(() => {
            console.log("Switching to pending filter after send");
            console.log("Current quotes after fetch:", currentQuotes.length);
            console.log("Current quotes statuses:", currentQuotes.map(q => ({ id: q.id, status: q.status })));
            filterEvents('pending');
        }, 1000);
        
    } catch (error) {
        console.error('Error sending quote to manager:', error);
        alert('שגיאה בשליחת הבקשה: ' + error.message);
    }
}

async function loadUserInfo() {
    const token = getToken();
    if (!token) return;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userNameEl = document.getElementById("userName");
        if (userNameEl && payload.email) {
            userNameEl.textContent = payload.email.split('@')[0];
        }
    } catch (err) {
        console.error("Error loading user info:", err);
    }
}

/*********************************
 * EVENTS
 *********************************/
let currentEvents = [];
let currentQuotes = [];
let currentMergedData = []; // Merged events and quotes by eventId
let currentFilter = 'all';

async function fetchEvents() {
    const token = getToken();
    if (!token) {
        document.getElementById("eventsList").innerHTML = 
            `<div class="text-center py-5">
                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <p class="text-muted">אנא התחבר תחילה</p>
            </div>`;
        return;
    }

    const eventsListEl = document.getElementById("eventsList");
    if (!eventsListEl) return;

    // Show loading
    eventsListEl.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>טוען אירועים...</p>
        </div>
    `;

    try {
        // Fetch both events and quote requests in parallel
        const [eventsRes, quotesRes] = await Promise.all([
            fetch(EVENTS_URL, {
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            }),
            fetch(CLIENT_QUOTE_REQUESTS_URL, {
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            })
        ]);

        if (eventsRes.status === 401 || quotesRes.status === 401) {
            alert("פג תוקף ההתחברות. אנא התחבר שוב.");
            logout();
            return;
        }

        // Parse events
        let eventsData = [];
        if (eventsRes.ok) {
            eventsData = await eventsRes.json();
        }
        currentEvents = Array.isArray(eventsData) ? eventsData : [];

        // Parse quotes
        let quotesData = [];
        if (quotesRes.ok) {
            quotesData = await quotesRes.json();
        }
        currentQuotes = Array.isArray(quotesData) ? quotesData : [];
        
        // Debug: Log quotes to console
        console.log("=== FETCHED QUOTES ===");
        console.log("Number of quotes:", currentQuotes.length);
        console.log("All quotes with status:", currentQuotes.map(q => ({ 
            id: q.id, 
            status: q.status, 
            eventName: q.eventName || 'ללא שם',
            participantCount: q.participantCount,
            eventId: q.eventId
        })));
        if (currentQuotes.length > 0) {
            console.log("First quote full data:", JSON.stringify(currentQuotes[0], null, 2));
        }
        console.log("=== END FETCHED QUOTES ===");
        
        // Merge events and quotes by eventId
        const byEventId = new Map();
        
        // First, add all events
        currentEvents.forEach(event => {
            byEventId.set(event.id, { event: event, quote: null });
        });
        
        // Then, add quotes (merge with events if eventId exists, or create new entry)
        currentQuotes.forEach(qr => {
            const key = qr.eventId;
            if (!byEventId.has(key)) {
                // Quote without event - create entry with event as null
                byEventId.set(key, { event: null, quote: qr });
            } else {
                // Event exists - add quote to it
                byEventId.get(key).quote = qr;
            }
        });
        
        // Store merged data
        currentMergedData = Array.from(byEventId.values());
        
        if (currentMergedData.length === 0) {
            eventsListEl.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <p class="text-muted">לא נמצאו אירועים</p>
                </div>
            `;
        } else {
            renderEvents();
        }
    } catch (err) {
        console.error("Error fetching events:", err);
        eventsListEl.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <p class="text-danger">שגיאה בטעינת אירועים</p>
                <small class="text-muted">${err.message}</small>
            </div>
        `;
    }
}

function filterEvents(filter) {
    currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.trim() === getFilterText(filter)) {
            btn.classList.add('active');
        }
    });
    
    renderEvents();
}

// Make filterEvents globally accessible for onclick handlers
window.filterEvents = filterEvents;

function getFilterText(filter) {
    const filterMap = {
        'all': 'הכל',
        'pending': 'ממתינים לאישור',
        'approved': 'מאושרים',
        'completed': 'הושלמו'
    };
    return filterMap[filter] || 'הכל';
}

function renderEvents() {
    const eventsList = document.getElementById("eventsList");
    if (!eventsList) return;

    // Filter merged data based on current filter
    let filteredMerged = currentMergedData.filter(item => {
        const event = item.event;
        const quote = item.quote;
        
        if (currentFilter === 'pending') {
            // Show items with pending status (either event or quote)
            const eventPending = event && (event.status === 'PENDING_APPROVAL' || event.status === 'QUOTE_PENDING');
            const quotePending = quote && (
                quote.status === 'QUOTE_PENDING' ||
                quote.status === 'submitted' || 
                quote.status === 'SUBMITTED' ||
                quote.status === 'pending_approval' ||
                quote.status === 'PENDING_APPROVAL' ||
                quote.status === 'SENT_TO_MANAGER' ||
                quote.status === 'MANAGER_REVIEW' ||
                quote.status === 'DRAFT' ||
                quote.status === 'PENDING_CLIENT_FINAL'
            );
            return eventPending || quotePending;
        } else if (currentFilter === 'approved') {
            const eventApproved = event && (event.status === 'APPROVED' || event.status === 'CONFIRMED');
            const quoteApproved = quote && (quote.status === 'approved' || quote.status === 'APPROVED');
            return eventApproved || quoteApproved;
        } else if (currentFilter === 'completed') {
            const eventCompleted = event && event.status === 'COMPLETED';
            const quoteCompleted = quote && (
                quote.status === 'completed' || 
                quote.status === 'COMPLETED' ||
                quote.status === 'cancelled' ||
                quote.status === 'CANCELLED' ||
                quote.status === 'REJECTED' ||
                quote.status === 'rejected' ||
                quote.status === 'CLOSED' ||
                quote.status === 'closed'
            );
            return eventCompleted || quoteCompleted;
        } else {
            // Show all
            return true;
        }
    });

    if (filteredMerged.length === 0) {
        eventsList.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <p class="text-muted">לא נמצאו אירועים</p>
                <small class="text-muted d-block mt-2">צור אירוע חדש באמצעות כפתור "בדיקת הצעת מחיר לאירוע"</small>
            </div>
        `;
        return;
    }

    // Clear and create cards with event listeners
    eventsList.innerHTML = '';
    
    filteredMerged.forEach(item => {
        const event = item.event;
        const quote = item.quote;
        
        // Use event data if available, otherwise use quote data
        const eventId = event ? event.id : (quote ? quote.eventId : null);
        const eventName = event ? event.name : (quote ? quote.eventName : "ללא שם");
        const eventDate = event ? event.eventDate : (quote ? quote.eventDate : null);
        const startTime = event ? event.startTime : (quote ? quote.startTime : null);
        const location = event ? event.location : (quote ? quote.location : null);
        const participantCount = event ? event.participantCount : (quote ? quote.participantCount : 0);
        
        // Determine status based on quote if exists, otherwise use event status
        let statusText = 'טיוטה';
        let statusClass = 'status-draft';
        let statusIcon = 'edit';
        let showPrice = false;
        let price = null;
        
        if (quote) {
            // If quote exists, use quote status
            const status = quote.status || '';
            const isDraft = status === 'DRAFT' || status === 'draft';
            const isPending = status === 'QUOTE_PENDING' ||
                            status === 'SENT_TO_MANAGER' || 
                            status === 'MANAGER_REVIEW' || 
                            status === 'pending_approval' || 
                            status === 'PENDING_APPROVAL' ||
                            status === 'submitted' ||
                            status === 'SUBMITTED';
            const isPendingClientFinal = status === 'PENDING_CLIENT_FINAL';
            const isApproved = status === 'APPROVED' || status === 'approved' || status === 'CLIENT_APPROVED';
            const isRejected = status === 'REJECTED' || status === 'rejected' || status === 'CLIENT_REJECTED';
            
            if (isPendingClientFinal) {
                statusText = 'ממתין לאישור סופי';
                statusClass = 'status-pending';
                statusIcon = 'clock';
                showPrice = true;
                price = quote.finalPrice || quote.quoteAmount || quote.price;
            } else if (isPending) {
                statusText = 'ממתין לאישור';
                statusClass = 'status-pending';
                statusIcon = 'clock';
                showPrice = true;
                price = quote.quoteAmount || quote.price;
            } else if (isApproved) {
                statusText = 'אושר';
                statusClass = 'status-approved';
                statusIcon = 'check';
                showPrice = true;
                price = quote.finalPrice || quote.quoteAmount || quote.price;
            } else if (isRejected) {
                statusText = 'נדחה';
                statusClass = 'status-rejected';
                statusIcon = 'times';
            } else if (isDraft) {
                statusText = 'טיוטה';
                statusClass = 'status-draft';
                statusIcon = 'edit';
            }
        } else if (event) {
            // No quote, use event status
            statusText = getStatusText(event.status);
            statusClass = getStatusClass(event.status);
            statusIcon = event.status === 'PENDING_APPROVAL' || event.status === 'QUOTE_PENDING' ? 'clock' : 
                        event.status === 'APPROVED' || event.status === 'CONFIRMED' ? 'check' : 'edit';
        }
        
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <div class="event-header">
                <div class="event-name">${eventName}</div>
                <span class="event-status ${statusClass}">
                    <i class="fas fa-${statusIcon}"></i> ${statusText}
                </span>
            </div>
            <div class="event-details">
                ${eventDate ? `
                    <div class="event-detail">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(eventDate)}</span>
                    </div>
                ` : ''}
                ${startTime ? `
                    <div class="event-detail">
                        <i class="fas fa-clock"></i>
                        <span>${formatTime(startTime)}</span>
                    </div>
                ` : ''}
                ${location ? `
                    <div class="event-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${location}</span>
                    </div>
                ` : ''}
                ${participantCount ? `
                    <div class="event-detail">
                        <i class="fas fa-users"></i>
                        <span>${participantCount} משתתפים</span>
                    </div>
                ` : ''}
                ${showPrice && price ? `
                    <div class="event-detail">
                        <i class="fas fa-shekel-sign"></i>
                        <span>${formatPrice(price)} ₪</span>
                        ${quote && quote.status === 'PENDING_CLIENT_FINAL' ? '<span class="badge bg-success ms-2">מחיר סופי</span>' : ''}
                    </div>
                ` : ''}
                ${quote && quote.requestedWorkers ? `
                    <div class="event-detail">
                        <i class="fas fa-user-tie"></i>
                        <span>${quote.requestedWorkers} נציגי רישום</span>
                    </div>
                ` : ''}
                ${quote && quote.status === 'PENDING_CLIENT_FINAL' && quote.adminNotes ? `
                    <div class="event-detail mt-2 p-2 bg-light rounded">
                        <i class="fas fa-comment-alt"></i>
                        <strong>הערות מנהל:</strong>
                        <p class="mb-0 mt-1">${quote.adminNotes}</p>
                    </div>
                ` : ''}
            </div>
            <div class="event-actions">
                ${quote && quote.status === 'PENDING_CLIENT_FINAL' ? `
                    <button class="btn-event-action btn-success-action me-2" onclick="event.stopPropagation(); approveFinalQuote(${quote.id})">
                        <i class="fas fa-check"></i> אישור סופי
                    </button>
                    <button class="btn-event-action btn-danger-action" onclick="event.stopPropagation(); rejectFinalQuote(${quote.id})">
                        <i class="fas fa-times"></i> דחייה
                    </button>
                ` : quote && (quote.status === 'DRAFT' || quote.status === 'draft') ? `
                    <button class="btn-event-action btn-primary-action" onclick="event.stopPropagation(); sendToManager(${quote.id})">
                        <i class="fas fa-paper-plane"></i> שלח למנהל
                    </button>
                ` : quote && (quote.status === 'QUOTE_PENDING' ||
                              quote.status === 'SENT_TO_MANAGER' || 
                              quote.status === 'MANAGER_REVIEW' || 
                              quote.status === 'pending_approval' || 
                              quote.status === 'PENDING_APPROVAL' ||
                              quote.status === 'submitted' ||
                              quote.status === 'SUBMITTED') ? `
                    <small class="text-muted">
                        <i class="fas fa-info-circle"></i>
                        הבקשה נשלחה למנהל החברה לאישור
                    </small>
                ` : quote && (quote.status === 'APPROVED' || quote.status === 'approved' || quote.status === 'CLIENT_APPROVED') ? `
                    <small class="text-success">
                        <i class="fas fa-check-circle"></i>
                        הבקשה אושרה על ידי המנהל
                    </small>
                ` : quote && (quote.status === 'REJECTED' || quote.status === 'rejected' || quote.status === 'CLIENT_REJECTED') ? `
                    <small class="text-danger">
                        <i class="fas fa-times-circle"></i>
                        הבקשה נדחתה: ${quote.rejectReason || quote.adminNote || 'ללא סיבה'}
                    </small>
                ` : event ? `
                    <button class="btn-event-action btn-view" onclick="event.stopPropagation(); viewEvent(${event.id})">
                        <i class="fas fa-eye"></i> צפה בפרטים
                    </button>
                    ${event.status === 'APPROVED' || event.status === 'CONFIRMED' ? `
                        <button class="btn-event-action btn-send-message" onclick="event.stopPropagation(); openMessageModalForEvent(${event.id})">
                            <i class="fas fa-envelope"></i> שלח הודעה
                        </button>
                    ` : ''}
                    <button class="btn-event-action btn-danger-action" data-event-id="${event.id}" onclick="event.stopPropagation(); deleteEvent(this)">
                        <i class="fas fa-trash"></i> מחק
                    </button>
                ` : ''}
            </div>
        `;
        
        // Make card clickable if it has a quote
        if (quote) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                // Don't open modal if clicking on buttons or action area
                if (!e.target.closest('.btn-event-action') && !e.target.closest('.event-actions')) {
                    openQuoteDetailsModal(quote);
                }
            });
        }
        
        eventsList.appendChild(card);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[s]));
}

function openQuoteDetailsModal(q) {
    const modal = document.createElement("div");
    modal.className = "xmile-modal-overlay";
    modal.innerHTML = `
        <div class="xmile-modal">
            <div class="xmile-modal-header">
                <h3>פרטי הצעת המחיר</h3>
                <button class="xmile-modal-close">✕</button>
            </div>

            <div class="xmile-modal-body">
                <div><b>אירוע:</b> ${escapeHtml(q.eventName || "-")}</div>
                <div><b>תאריך:</b> ${escapeHtml(q.eventDate ? formatDate(q.eventDate) : "-")} | <b>שעה:</b> ${escapeHtml(q.startTime ? formatTime(q.startTime) : "-")}</div>
                <div><b>מיקום:</b> ${escapeHtml(q.location || "-")}</div>
                <div><b>מספר משתתפים:</b> ${q.participantCount || "-"}</div>
                <hr/>
                <div><b>מחיר סופי:</b> ₪ ${q.finalPrice ? formatPrice(q.finalPrice) : (q.quoteAmount ? formatPrice(q.quoteAmount) : "-")}</div>
                <div><b>מספר עובדים מועדף:</b> ${q.workersNeeded || q.requestedWorkers || "-"}</div>
                <hr/>
                <div><b>הערות מנהל:</b></div>
                <div class="xmile-notes">${escapeHtml(q.adminNotes || q.adminNote || q.notes || "אין הערות")}</div>
                ${q.status ? `<div class="mt-2"><b>סטטוס:</b> ${escapeHtml(q.status)}</div>` : ''}
            </div>

            <div class="xmile-modal-footer">
                <button class="xmile-btn" id="closeModalBtn">סגירה</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector(".xmile-modal-close").onclick = close;
    modal.querySelector("#closeModalBtn").onclick = close;
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
}

function getStatusText(status) {
    const statusMap = {
        "DRAFT": "טיוטה",
        "QUOTE_PENDING": "ממתין לאישור מנהל",
        "PENDING_APPROVAL": "ממתין לאישור",
        "APPROVED": "מאושר",
        "CONFIRMED": "מאושר",
        "COMPLETED": "הושלם",
        "CANCELLED": "בוטל"
    };
    return statusMap[status] || status;
}

function getStatusClass(status) {
    if (status === 'PENDING_APPROVAL' || status === 'QUOTE_PENDING') return 'status-pending';
    if (status === 'APPROVED' || status === 'CONFIRMED') return 'status-approved';
    if (status === 'COMPLETED') return 'status-completed';
    return 'status-pending';
}

function viewEvent(eventId) {
    const event = currentEvents.find(e => e.id === eventId);
    if (!event) return;
    
    alert(`פרטי האירוע:\nשם: ${event.name}\nתאריך: ${formatDate(event.eventDate)}\nמיקום: ${event.location}\nמשתתפים: ${event.participantCount}`);
}

/*********************************
 * DELETE EVENT
 *********************************/
async function deleteEvent(buttonElement) {
    const eventId = buttonElement.getAttribute('data-event-id');
    if (!eventId) {
        alert("שגיאה: לא נמצא מזהה אירוע");
        return;
    }
    
    const event = currentEvents.find(e => e.id === parseInt(eventId));
    const eventName = event ? event.name : `אירוע #${eventId}`;
    
    if (!confirm(`האם אתה בטוח שברצונך למחוק את האירוע "${eventName}"?\n\nפעולה זו לא ניתנת לביטול.`)) {
        return;
    }
    
    const token = getToken();
    if (!token) {
        alert("אנא התחבר תחילה");
        window.location.href = "/login.html";
        return;
    }
    
    try {
        const res = await fetch(`${EVENTS_URL}/id/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        if (res.status === 401) {
            alert("פג תוקף ההתחברות. אנא התחבר שוב.");
            window.location.href = "/login.html";
            return;
        }
        
        if (res.status === 403) {
            alert("אין לך הרשאה למחוק אירוע זה.");
            return;
        }
        
        if (res.status === 404) {
            alert("האירוע לא נמצא.");
            return;
        }
        
        if (!res.ok) {
            const errorText = await res.text().catch(() => 'שגיאה לא ידועה');
            throw new Error(errorText || "שגיאה במחיקת האירוע");
        }
        
        // Show success message
        alert("האירוע נמחק בהצלחה!");
        
        // Refresh events list
        await fetchEvents();
        
    } catch (err) {
        console.error("Error deleting event:", err);
        alert("שגיאה במחיקת האירוע: " + err.message);
    }
}

/*********************************
 * QUOTE REQUEST
 *********************************/
let currentQuote = null;

function openQuoteModalForEvent(buttonElement) {
    // Get eventId from data attribute
    const eventId = buttonElement.getAttribute('data-event-id');
    if (eventId) {
        window.location.href = `/quote-request.html?eventId=${eventId}`;
    } else {
        alert("שגיאה: לא נמצא מזהה אירוע");
    }
}

function openQuoteModal(eventId) {
    // If eventId is provided, navigate to quote-request.html with eventId parameter
    if (eventId && typeof eventId === 'number') {
        window.location.href = `/quote-request.html?eventId=${eventId}`;
        return;
    }
    
    // If no eventId, simply navigate to quote-request.html
    // The page will handle creating a new event or selecting an existing one
    window.location.href = '/quote-request.html';
}

async function handleQuoteSubmit(e) {
    e.preventDefault();

    const token = getToken();
    if (!token) {
        alert("אנא התחבר תחילה");
        return;
    }

    const quoteData = {
        eventName: document.getElementById('eventName').value,
        participantCount: parseInt(document.getElementById('participantCount').value),
        location: document.getElementById('eventLocation').value,
        eventDate: document.getElementById('eventDate').value,
        startTime: document.getElementById('eventTime').value + ':00',
        productionCompanyId: document.getElementById('productionCompany').value || null,
        notes: document.getElementById('eventNotes').value
    };

    try {
        const res = await fetch(QUOTES_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(quoteData)
        });

        if (!res.ok) {
            throw new Error("שגיאה ביצירת הצעת מחיר");
        }

        currentQuote = await res.json();
        
        // Close quote modal
        const quoteModalEl = document.getElementById('quoteModal');
        const quoteModal = bootstrap.Modal.getInstance(quoteModalEl);
        if (quoteModal) {
            quoteModal.hide();
        }

        // Show quote result
        displayQuoteResult(currentQuote);
        
        // Reset form
        e.target.reset();
        
        // Refresh events list
        fetchEvents();
    } catch (err) {
        alert("שגיאה: " + err.message);
        console.error(err);
    }
}

function displayQuoteResult(quote) {
    const summaryEl = document.getElementById('quoteSummary');
    const isEstimate = quote.status === 'submitted';
    
    summaryEl.innerHTML = `
        <div class="quote-details">
            ${isEstimate ? `
                <div class="alert alert-info mb-3">
                    <i class="fas fa-info-circle"></i>
                    <strong>הערה:</strong> זו הערכת מחיר ראשונית. המחיר הסופי ייקבע לאחר אישור החברה.
                </div>
            ` : ''}
            <h6>פרטי ההצעה:</h6>
            <div class="mb-3">
                <strong>שם האירוע:</strong> ${quote.eventName || currentQuote?.eventName || ''}
            </div>
            <div class="mb-3">
                <strong>מספר משתתפים:</strong> ${quote.participantCount || currentQuote?.participantCount || ''}
            </div>
            <div class="mb-3">
                <strong>מיקום:</strong> ${quote.location || currentQuote?.location || ''}
            </div>
            <div class="mb-3">
                <strong>תאריך ושעה:</strong> ${formatDate(quote.eventDate || currentQuote?.eventDate || '')} 
                ${formatTime(quote.startTime || currentQuote?.startTime || '')}
            </div>
            <div class="quote-price mb-3">
                <strong>${isEstimate ? 'הערכת מחיר' : 'מחיר סופי'}:</strong> 
                <span class="price-amount ${isEstimate ? 'text-warning' : 'text-success'}" style="font-size: 24px; font-weight: bold;">
                    ₪${quote.totalPrice || quote.price || '0'}
                </span>
                ${isEstimate ? '<small class="text-muted d-block">(הערכה בלבד)</small>' : ''}
            </div>
            ${quote.breakdown ? `
                <div class="quote-breakdown">
                    <h6>פירוט:</h6>
                    <ul class="list-unstyled">
                        <li>מחיר בסיס: ₪${quote.breakdown.basePrice || 0}</li>
                        <li>עמלה: ₪${quote.breakdown.commission || 0}</li>
                        <li>סה"כ: ₪${quote.breakdown.totalPrice || quote.totalPrice || 0}</li>
                    </ul>
                </div>
            ` : ''}
        </div>
    `;

    const resultModal = new bootstrap.Modal(document.getElementById('quoteResultModal'));
    resultModal.show();
}

function approveQuote() {
    if (!currentQuote) {
        alert("אין הצעה לאישור");
        return;
    }
    
    // Close quote result modal
    const resultModalEl = document.getElementById('quoteResultModal');
    const resultModal = bootstrap.Modal.getInstance(resultModalEl);
    if (resultModal) {
        resultModal.hide();
    }

    // Open representatives modal
    const repsModalEl = document.getElementById('representativesModal');
    if (repsModalEl) {
        const repsModal = new bootstrap.Modal(repsModalEl);
        repsModal.show();
    } else {
        console.error('Representatives modal not found');
    }
}

async function handleRepresentativesSubmit(e) {
    e.preventDefault();

    const token = getToken();
    if (!token) {
        alert("אנא התחבר תחילה");
        return;
    }

    if (!currentQuote || !currentQuote.id) {
        alert("אין הצעה לאישור");
        return;
    }

    const representativesCount = parseInt(document.getElementById('representativesCount').value);
    if (!representativesCount || representativesCount < 1) {
        alert("אנא הזן מספר נציגים תקין");
        return;
    }

    try {
        // Approve quote and send representatives request
        const res = await fetch(`${QUOTES_URL}/${currentQuote.id}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                representativesCount: representativesCount
            })
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || "שגיאה באישור ההצעה");
        }

        alert("ההצעה אושרה והבקשה נשלחה לחברה לאישור!");
        
        const repsModalEl = document.getElementById('representativesModal');
        const repsModal = bootstrap.Modal.getInstance(repsModalEl);
        if (repsModal) {
            repsModal.hide();
        }

        // Reset form
        e.target.reset();

        // Refresh events
        fetchEvents();
    } catch (err) {
        alert("שגיאה: " + err.message);
        console.error(err);
    }
}

/*********************************
 * PRODUCTION COMPANIES
 *********************************/
async function loadProductionCompanies() {
    const token = getToken();
    if (!token) return;
    
    try {
        const res = await fetch(`${API_BASE}/production-companies`, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        if (res.ok) {
            const companies = await res.json();
            const selectEl = document.getElementById('productionCompany');
            if (selectEl) {
                selectEl.innerHTML = '<option value="">החברה תציע שירות</option>' +
                    companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            }
        } else {
            console.warn("Failed to load production companies:", res.status);
            // Keep default options if API fails
        }
    } catch (err) {
        console.error("Error loading production companies:", err);
        // Keep default options if API fails
    }
}

/*********************************
 * MESSAGES
 *********************************/
let selectedEventId = null;
let selectedContentOption = null;
let selectedDesignOption = null;

function openMessageModal() {
    console.log('openMessageModal called');
    
    const modalElement = document.getElementById('messageModal');
    if (!modalElement) {
        console.error('Message modal element not found');
        alert('שגיאה: לא נמצא טופס שליחת הודעה');
        return;
    }
    
    selectedEventId = null;
    resetMessageWizard();
    
    // Check if Bootstrap is loaded
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not loaded');
        alert('שגיאה: Bootstrap לא נטען. אנא רענן את הדף.');
        return;
    }
    
    try {
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: true,
            keyboard: true
        });
        modal.show();
        console.log('Message modal shown successfully');
        
        // Load events for selection
        loadEventsForMessage();
    } catch (err) {
        console.error('Error showing message modal:', err);
        alert('שגיאה בפתיחת הטופס: ' + err.message);
    }
}

function openMessageModalForEvent(eventId) {
    console.log('openMessageModalForEvent called with eventId:', eventId);
    
    // Navigate to campaign builder page with eventId
    if (eventId) {
        window.location.href = `/client-campaign-builder.html?eventId=${eventId}`;
    } else {
        window.location.href = '/client-campaign-builder.html';
    }
}

function loadEventsForMessage() {
    const selectEl = document.getElementById('selectedEvent');
    if (!selectEl) return;

    const approvedEvents = currentEvents.filter(e => 
        e.status === 'APPROVED' || e.status === 'CONFIRMED'
    );

    selectEl.innerHTML = '<option value="">בחר אירוע...</option>' +
        approvedEvents.map(e => 
            `<option value="${e.id}">${e.name} - ${formatDate(e.eventDate)}</option>`
        ).join('');
}

function resetMessageWizard() {
    // Reset to step 1
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });
    const step1 = document.getElementById('step1');
    if (step1) {
        step1.classList.add('active');
    }
    
    // Clear selections
    selectedContentOption = null;
    selectedDesignOption = null;
    
    const participantsList = document.getElementById('participantsList');
    if (participantsList) participantsList.value = '';
    
    const aiMessageRequest = document.getElementById('aiMessageRequest');
    if (aiMessageRequest) aiMessageRequest.value = '';
    
    // Hide options
    const contentOptions = document.getElementById('contentOptions');
    if (contentOptions) contentOptions.style.display = 'none';
    
    const designOptions = document.getElementById('designOptions');
    if (designOptions) designOptions.style.display = 'none';
    
    const continueBtn = document.getElementById('continueToSend');
    if (continueBtn) continueBtn.style.display = 'none';
}

function nextStep(stepNum) {
    // Validate current step
    if (stepNum === 2) {
        const eventIdEl = document.getElementById('selectedEvent');
        if (!eventIdEl || !eventIdEl.value) {
            alert("אנא בחר אירוע");
            return;
        }
        selectedEventId = parseInt(eventIdEl.value);
    }

    if (stepNum === 3) {
        const participantsEl = document.getElementById('participantsList');
        if (!participantsEl || !participantsEl.value.trim()) {
            alert("אנא הזן משתתפים");
            return;
        }
    }

    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });

    // Show target step
    const targetStep = document.getElementById(`step${stepNum}`);
    if (targetStep) {
        targetStep.classList.add('active');
    } else {
        console.error(`Step ${stepNum} not found`);
    }
}

function prevStep(stepNum) {
    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show target step
    const targetStep = document.getElementById(`step${stepNum}`);
    if (targetStep) {
        targetStep.classList.add('active');
    } else {
        console.error(`Step ${stepNum} not found`);
    }
}

async function generateAIMessages() {
    // Check if modal is open
    const modal = getMessageModal();
    if (!modal || !modal.classList.contains('show')) {
        console.warn('generateAIMessages: message modal is not open');
        alert('אנא פתח את חלון שליחת ההודעה תחילה');
        return;
    }
    
    const aiMessageRequestEl = modal.querySelector('#aiMessageRequest');
    if (!aiMessageRequestEl) {
        console.error('aiMessageRequest element not found - modal structure may be broken');
        alert('שגיאה: לא נמצא שדה בקשת הודעה. אנא רענן את הדף.');
        return;
    }
    const request = aiMessageRequestEl.value;
    if (!request.trim()) {
        alert("אנא תאר מה אתה רוצה לשלוח");
        return;
    }

    const token = getToken();
    if (!token) return;

    try {
        // Ensure we're on step 3
        const step3 = modal.querySelector('#step3');
        if (!step3 || !step3.classList.contains('active')) {
            console.warn('generateAIMessages: step3 is not active, activating it...');
            nextStep(3);
            // Wait for DOM to update
            await new Promise(resolve => setTimeout(resolve, 200));
            // Re-query step3 after activation
            const updatedStep3 = modal.querySelector('#step3');
            if (!updatedStep3) {
                console.error('generateAIMessages: step3 not found after activation');
                alert('שגיאה: לא נמצא שלב 3. אנא רענן את הדף.');
                return;
            }
        }
        
        // Get step3 again to ensure we have the latest reference
        const step3Ref = modal.querySelector('#step3');
        if (!step3Ref) {
            console.error('generateAIMessages: step3 not found');
            alert('שגיאה: לא נמצא שלב 3. אנא רענן את הדף.');
            return;
        }
        
        // Wait for elements to be available within step3
        const contentOptions = await waitForElement('#contentOptions', step3Ref, 2000);
        if (!contentOptions) {
            console.error('contentOptions element not found after waiting - modal structure may be broken');
            alert('שגיאה: לא נמצא אזור תוכן. אנא רענן את הדף.');
            return;
        }
        
        // Wait for grid element within step3
        const grid = await waitForElement('#contentOptionsGrid', step3Ref, 2000);
        if (!grid) {
            console.error('contentOptionsGrid element not found after waiting - creating it...');
            // Try to create it if it doesn't exist
            const newGrid = document.createElement('div');
            newGrid.id = 'contentOptionsGrid';
            newGrid.className = 'options-grid';
            const h6 = contentOptions.querySelector('h6');
            if (h6 && h6.nextSibling) {
                contentOptions.insertBefore(newGrid, h6.nextSibling);
            } else {
                contentOptions.appendChild(newGrid);
            }
            // Use the newly created grid
            const createdGrid = contentOptions.querySelector('#contentOptionsGrid');
            if (!createdGrid) {
                alert('שגיאה: לא ניתן ליצור אזור תוכן. אנא רענן את הדף.');
                return;
            }
        }
        
        // Show loading state - query within step3
        const loadingHtml = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> יוצר תוכן...</div>';
        const existingGrid = step3Ref.querySelector('#contentOptionsGrid');
        if (existingGrid) {
            existingGrid.innerHTML = loadingHtml;
        } else {
            const fallbackContentOptions = step3Ref.querySelector('#contentOptions');
            if (fallbackContentOptions) {
                fallbackContentOptions.innerHTML = loadingHtml;
            }
        }
        if (contentOptions) {
            contentOptions.style.display = 'block';
        }

        // Call AI API
        const res = await fetch(`${MESSAGES_URL}/ai/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                request: request,
                eventId: selectedEventId
            })
        });

        if (!res.ok) {
            throw new Error("שגיאה ביצירת תוכן");
        }

        const data = await res.json();
        
        // Display content options
        displayContentOptions(data.contentOptions || [
            "הודעה מקצועית סטנדרטית",
            "הודעה ידידותית וחמה",
            "הודעה פורמלית ומפורטת"
        ]);

        // Generate design options
        generateDesignOptions();
    } catch (err) {
        alert("שגיאה: " + err.message);
        console.error(err);
    }
}

/**
 * Wait for an element to appear in the DOM using MutationObserver for robust detection
 * @param {string} selector - CSS selector
 * @param {Element} container - Container element to search within (default: document)
 * @param {number} timeout - Maximum wait time in ms (default: 2000)
 * @returns {Promise<Element|null>}
 */
function waitForElement(selector, container = document, timeout = 2000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        // First, check if element already exists
        let element = container.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }
        
        // Use MutationObserver for better detection of DOM changes
        const observer = new MutationObserver((mutations, obs) => {
            element = container.querySelector(selector);
            if (element) {
                obs.disconnect();
                resolve(element);
                return;
            }
            
            // Timeout check
            if (Date.now() - startTime > timeout) {
                obs.disconnect();
                console.warn(`waitForElement: timeout waiting for ${selector} in container`, container);
                resolve(null);
                return;
            }
        });
        
        // Start observing
        observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'id']
        });
        
        // Fallback: also check periodically with requestAnimationFrame
        function check() {
            element = container.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
                return;
            }
            
            if (Date.now() - startTime > timeout) {
                observer.disconnect();
                console.warn(`waitForElement: timeout waiting for ${selector} in container`, container);
                resolve(null);
                return;
            }
            
            requestAnimationFrame(check);
        }
        
        check();
    });
}

/**
 * Get the message modal element, ensuring it's in the DOM
 */
function getMessageModal() {
    return document.getElementById('messageModal');
}

function displayContentOptions(options) {
    const modal = getMessageModal();
    if (!modal) {
        console.error('displayContentOptions: messageModal not found');
        return;
    }
    
    // Ensure we're on step 3 (AI message generation step)
    const step3 = modal.querySelector('#step3');
    if (!step3 || !step3.classList.contains('active')) {
        console.warn('displayContentOptions: step3 is not active');
        if (modal.classList.contains('show')) {
            nextStep(3);
            // Wait for DOM to update, then retry
            setTimeout(() => displayContentOptions(options), 200);
            return;
        }
        return;
    }
    
    // Query within step3 where the element actually exists
    waitForElement('#contentOptionsGrid', step3, 2000).then(grid => {
        if (!grid) {
            console.error('contentOptionsGrid element not found after waiting - modal may not be fully loaded');
            // Try to create it if it doesn't exist
            const contentOptions = step3.querySelector('#contentOptions');
            if (contentOptions) {
                const newGrid = document.createElement('div');
                newGrid.id = 'contentOptionsGrid';
                newGrid.className = 'options-grid';
                const h6 = contentOptions.querySelector('h6');
                if (h6 && h6.nextSibling) {
                    contentOptions.insertBefore(newGrid, h6.nextSibling);
                } else {
                    contentOptions.appendChild(newGrid);
                }
                renderContentOptions(newGrid, options);
            } else {
                console.error('contentOptions container not found in step3');
            }
            return;
        }
        
        renderContentOptions(grid, options);
    });
}

function renderContentOptions(grid, options) {
    grid.innerHTML = options.map((option, index) => `
        <div class="option-card" onclick="selectContentOption(${index}, '${option.replace(/'/g, "\\'")}')">
            <h6>אופציה ${index + 1}</h6>
            <div class="option-preview">${option}</div>
        </div>
    `).join('');

    // Show content options container - query within step3
    const modal = getMessageModal();
    if (modal) {
        const step3 = modal.querySelector('#step3');
        if (step3) {
            const contentOptions = step3.querySelector('#contentOptions');
            if (contentOptions) {
                contentOptions.style.display = 'block';
            }
        }
    }
}

function selectContentOption(index, content) {
    selectedContentOption = { index, content };
    
    const modal = getMessageModal();
    if (!modal) return;
    
    // Query within step3 where the element actually exists
    const step3 = modal.querySelector('#step3');
    if (!step3) return;
    
    const grid = step3.querySelector('#contentOptionsGrid');
    if (grid) {
        grid.querySelectorAll('.option-card').forEach((card, i) => {
            if (i === index) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    // Show design options if not shown
    const designOptions = step3.querySelector('#designOptions');
    if (designOptions && (!designOptions.style.display || designOptions.style.display === 'none')) {
        generateDesignOptions();
    }
}

function generateDesignOptions() {
    const modal = getMessageModal();
    if (!modal) {
        console.warn('generateDesignOptions: messageModal not found');
        return;
    }
    
    // Query within step3 where the element actually exists
    const step3 = modal.querySelector('#step3');
    if (!step3) {
        console.warn('generateDesignOptions: step3 not found');
        return;
    }
    
    const event = currentEvents.find(e => e.id === selectedEventId);
    const designOptions = [
        {
            name: "עיצוב קלאסי",
            description: "עיצוב מקצועי ופורמלי",
            colors: ["#1a1a1a", "#4285f4", "#ffffff"]
        },
        {
            name: "עיצוב מודרני",
            description: "עיצוב צבעוני ומודרני",
            colors: ["#4285f4", "#34a853", "#fbbc04"]
        },
        {
            name: "עיצוב מותאם אישית",
            description: "עיצוב בהתאם לאירוע",
            colors: ["#9c27b0", "#ff5733", "#ffffff"]
        }
    ];

    waitForElement('#designOptionsGrid', step3, 2000).then(grid => {
        if (!grid) {
            console.warn('designOptionsGrid element not found after waiting');
            // Try to create it within step3
            const designOptionsContainer = step3.querySelector('#designOptions');
            if (designOptionsContainer) {
                const newGrid = document.createElement('div');
                newGrid.id = 'designOptionsGrid';
                newGrid.className = 'options-grid';
                const h6 = designOptionsContainer.querySelector('h6');
                if (h6 && h6.nextSibling) {
                    designOptionsContainer.insertBefore(newGrid, h6.nextSibling);
                } else {
                    designOptionsContainer.appendChild(newGrid);
                }
                renderDesignOptions(newGrid, designOptions);
            }
            return;
        }
        
        renderDesignOptions(grid, designOptions);
    });
}

function renderDesignOptions(grid, designOptions) {
    grid.innerHTML = designOptions.map((design, index) => `
        <div class="option-card" onclick="selectDesignOption(${index})">
            <h6>${design.name}</h6>
            <div class="option-preview">${design.description}</div>
            <div class="design-colors mt-2">
                ${design.colors.map(color => 
                    `<span class="color-dot" style="background: ${color}"></span>`
                ).join('')}
            </div>
        </div>
    `).join('');

    // Show design options container - query within step3
    const modal = getMessageModal();
    if (modal) {
        const step3 = modal.querySelector('#step3');
        if (step3) {
            const designOptionsEl = step3.querySelector('#designOptions');
            if (designOptionsEl) {
                designOptionsEl.style.display = 'block';
            }
        }
    }
}

function selectDesignOption(index) {
    selectedDesignOption = index;
    
    const modal = getMessageModal();
    if (!modal) return;
    
    // Query within step3 where the element actually exists
    const step3 = modal.querySelector('#step3');
    if (!step3) return;
    
    const grid = step3.querySelector('#designOptionsGrid');
    if (grid) {
        grid.querySelectorAll('.option-card').forEach((card, i) => {
            if (i === index) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    // Show continue button
    if (selectedContentOption && selectedDesignOption !== null) {
        const continueBtn = modal.querySelector('#continueToSend');
        if (continueBtn) {
            continueBtn.style.display = 'block';
        }
        updateMessagePreview();
    }
}

function updateMessagePreview() {
    const modal = getMessageModal();
    if (!modal) return;
    
    const event = currentEvents.find(e => e.id === selectedEventId);
    const preview = modal.querySelector('#messagePreview');
    
    if (!preview || !event || !selectedContentOption) return;

    preview.innerHTML = `
        <div style="padding: 20px; border-radius: 8px; background: linear-gradient(135deg, #4285f4 0%, #1a73e8 100%); color: white;">
            <h5>${event.name}</h5>
            <p>${selectedContentOption.content}</p>
            <div style="margin-top: 16px; font-size: 12px; opacity: 0.9;">
                <div>📅 ${formatDate(event.eventDate)}</div>
                <div>🕐 ${formatTime(event.startTime)}</div>
                <div>📍 ${event.location}</div>
            </div>
        </div>
    `;
}

async function sendMessages() {
    if (!selectedEventId || !selectedContentOption) {
        alert("אנא השלם את כל השלבים");
        return;
    }

    const modal = getMessageModal();
    if (!modal) {
        console.warn('sendMessages: messageModal not found');
        return;
    }
    
    const sendEmailEl = modal.querySelector('#sendEmail');
    const sendSMSEl = modal.querySelector('#sendSMS');
    if (!sendEmailEl || !sendSMSEl) {
        console.warn('Send options elements not found');
        return;
    }
    
    const sendEmail = sendEmailEl.checked;
    const sendSMS = sendSMSEl.checked;

    if (!sendEmail && !sendSMS) {
        alert("אנא בחר לפחות דרך שליחה אחת");
        return;
    }

    const participantsEl = modal.querySelector('#participantsList');
    if (!participantsEl) {
        console.warn('participantsList element not found');
        return;
    }
    const participants = participantsEl.value;
    if (!participants.trim()) {
        alert("אנא הזן משתתפים");
        return;
    }

    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(`${MESSAGES_URL}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                eventId: selectedEventId,
                content: selectedContentOption.content,
                designOption: selectedDesignOption,
                participants: participants.split('\n').filter(p => p.trim()),
                sendEmail: sendEmail,
                sendSMS: sendSMS
            })
        });

        if (!res.ok) {
            throw new Error("שגיאה בשליחת הודעות");
        }

        alert("ההודעות נשלחו בהצלחה!");
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('messageModal'));
        modal.hide();
    } catch (err) {
        alert("שגיאה: " + err.message);
        console.error(err);
    }
}

