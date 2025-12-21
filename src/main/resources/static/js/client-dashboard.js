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
            participantCount: q.participantCount 
        })));
        if (currentQuotes.length > 0) {
            console.log("First quote full data:", JSON.stringify(currentQuotes[0], null, 2));
        }
        console.log("=== END FETCHED QUOTES ===");
        
        if (currentEvents.length === 0 && currentQuotes.length === 0) {
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

    let filteredEvents = [...currentEvents] || [];
    let filteredQuotes = [];

    // Filter based on current filter
    if (currentFilter === 'pending') {
        // Show events with pending status AND quotes with submitted/pending_approval status
        filteredEvents = currentEvents.filter(e => 
            e.status === 'PENDING_APPROVAL' || 
            e.status === 'QUOTE_PENDING'
        );
        
        // Debug: Log filtering
        console.log("=== FILTERING QUOTES FOR PENDING ===");
        console.log("Total quotes:", currentQuotes.length);
        console.log("All quote statuses:", currentQuotes.map(q => q.status));
        
        filteredQuotes = currentQuotes.filter(q => {
            const status = q.status;
            // Include all pending-related statuses
            const matches = status === 'submitted' || 
                           status === 'SUBMITTED' ||
                           status === 'pending_approval' ||
                           status === 'PENDING_APPROVAL' ||
                           status === 'SENT_TO_MANAGER' ||
                           status === 'MANAGER_REVIEW' ||
                           status === 'DRAFT'; // DRAFT quotes can be sent, so show them in pending
            if (matches) {
                console.log("Quote matches pending filter:", q.id, "status:", status, "eventName:", q.eventName);
            }
            return matches;
        });
        
        console.log("Filtered quotes count:", filteredQuotes.length);
        console.log("Filtered quotes:", filteredQuotes.map(q => ({ id: q.id, status: q.status, eventName: q.eventName })));
        console.log("=== END FILTERING ===");
    } else if (currentFilter === 'approved') {
        filteredEvents = currentEvents.filter(e => 
            e.status === 'APPROVED' || 
            e.status === 'CONFIRMED'
        );
        filteredQuotes = currentQuotes.filter(q => {
            const status = q.status;
            // Include all approved-related statuses
            return status === 'approved' || 
                   status === 'APPROVED';
        });
        console.log("=== FILTERING QUOTES FOR APPROVED ===");
        console.log("Total quotes:", currentQuotes.length);
        console.log("Filtered quotes count:", filteredQuotes.length);
        console.log("Filtered quotes:", filteredQuotes.map(q => ({ id: q.id, status: q.status })));
        console.log("=== END FILTERING ===");
    } else if (currentFilter === 'completed') {
        filteredEvents = currentEvents.filter(e => e.status === 'COMPLETED');
        filteredQuotes = currentQuotes.filter(q => {
            const status = q.status;
            // Include all completed/rejected/closed statuses
            return status === 'completed' || 
                   status === 'COMPLETED' ||
                   status === 'cancelled' ||
                   status === 'CANCELLED' ||
                   status === 'REJECTED' ||
                   status === 'rejected' ||
                   status === 'CLOSED' ||
                   status === 'closed';
        });
        console.log("=== FILTERING QUOTES FOR COMPLETED ===");
        console.log("Total quotes:", currentQuotes.length);
        console.log("Filtered quotes count:", filteredQuotes.length);
        console.log("=== END FILTERING ===");
    } else {
        // Show all - include all quotes and events
        filteredQuotes = [...currentQuotes];
        console.log("=== SHOWING ALL QUOTES ===");
        console.log("Total quotes:", currentQuotes.length);
        console.log("All quote statuses:", currentQuotes.map(q => ({ id: q.id, status: q.status, eventName: q.eventName })));
        console.log("=== END ===");
    }

    // Combine events and quotes for display
    const allItems = [];
    
    // Add events
    filteredEvents.forEach(event => {
        allItems.push({
            type: 'event',
            data: event
        });
    });
    
    // Add quotes (for all filters)
    filteredQuotes.forEach(quote => {
        console.log("Adding quote to display:", quote.id, "status:", quote.status);
        allItems.push({
            type: 'quote',
            data: quote
        });
    });
    
    console.log("=== RENDERING ===");
    console.log("Current filter:", currentFilter);
    console.log("Total items to render:", allItems.length);
    console.log("Events:", filteredEvents.length);
    console.log("Quotes:", filteredQuotes.length);
    console.log("Filtered quotes:", filteredQuotes.map(q => ({ id: q.id, status: q.status })));
    console.log("=== END RENDERING ===");

    if (allItems.length === 0) {
        eventsList.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <p class="text-muted">לא נמצאו אירועים</p>
                <small class="text-muted d-block mt-2">צור אירוע חדש באמצעות כפתור "בדיקת הצעת מחיר לאירוע"</small>
            </div>
        `;
        return;
    }

    eventsList.innerHTML = allItems.map(item => {
        if (item.type === 'quote') {
            const quote = item.data;
            const status = quote.status || '';
            const isDraft = status === 'DRAFT' || status === 'draft';
            const isPending = status === 'SENT_TO_MANAGER' || 
                            status === 'MANAGER_REVIEW' || 
                            status === 'pending_approval' || 
                            status === 'PENDING_APPROVAL' ||
                            status === 'submitted' ||
                            status === 'SUBMITTED';
            const isApproved = status === 'APPROVED' || status === 'approved';
            const isRejected = status === 'REJECTED' || status === 'rejected';
            
            let statusText = 'טיוטה';
            let statusClass = 'status-draft';
            if (isPending) {
                statusText = 'ממתין לאישור מנהל';
                statusClass = 'status-pending';
            } else if (isApproved) {
                statusText = 'אושר';
                statusClass = 'status-approved';
            } else if (isRejected) {
                statusText = 'נדחה';
                statusClass = 'status-rejected';
            }
            
            return `
                <div class="event-card">
                    <div class="event-header">
                        <div class="event-name">${quote.eventName || "ללא שם"}</div>
                        <span class="event-status ${statusClass}">
                            <i class="fas fa-${isDraft ? 'edit' : isPending ? 'clock' : isApproved ? 'check' : 'times'}"></i> ${statusText}
                        </span>
                    </div>
                    <div class="event-details">
                        ${quote.eventDate ? `
                            <div class="event-detail">
                                <i class="fas fa-calendar"></i>
                                <span>${formatDate(quote.eventDate)}</span>
                            </div>
                        ` : ''}
                        ${quote.startTime ? `
                            <div class="event-detail">
                                <i class="fas fa-clock"></i>
                                <span>${formatTime(quote.startTime)}</span>
                            </div>
                        ` : ''}
                        ${quote.location ? `
                            <div class="event-detail">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${quote.location}</span>
                            </div>
                        ` : ''}
                        ${quote.participantCount ? `
                            <div class="event-detail">
                                <i class="fas fa-users"></i>
                                <span>${quote.participantCount} משתתפים</span>
                            </div>
                        ` : ''}
                        ${quote.quoteAmount || quote.price ? `
                            <div class="event-detail">
                                <i class="fas fa-shekel-sign"></i>
                                <span>${formatPrice(quote.quoteAmount || quote.price)} ₪</span>
                            </div>
                        ` : ''}
                        ${quote.requestedWorkers ? `
                            <div class="event-detail">
                                <i class="fas fa-user-tie"></i>
                                <span>${quote.requestedWorkers} נציגי רישום</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="event-actions">
                        ${isDraft ? `
                            <button class="btn-event-action btn-primary-action" onclick="sendToManager(${quote.id})">
                                <i class="fas fa-paper-plane"></i> שלח למנהל
                            </button>
                        ` : isPending ? `
                            <small class="text-muted">
                                <i class="fas fa-info-circle"></i>
                                הבקשה נשלחה למנהל החברה לאישור
                            </small>
                        ` : isApproved ? `
                            <small class="text-success">
                                <i class="fas fa-check-circle"></i>
                                הבקשה אושרה על ידי המנהל
                            </small>
                        ` : isRejected ? `
                            <small class="text-danger">
                                <i class="fas fa-times-circle"></i>
                                הבקשה נדחתה: ${quote.rejectReason || quote.adminNote || 'ללא סיבה'}
                            </small>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            const event = item.data;
            return `
                <div class="event-card">
                    <div class="event-header">
                        <div class="event-name">${event.name || "ללא שם"}</div>
                        <span class="event-status ${getStatusClass(event.status)}">${getStatusText(event.status)}</span>
                    </div>
                    <div class="event-details">
                        <div class="event-detail">
                            <i class="fas fa-calendar"></i>
                            <span>${formatDate(event.eventDate)}</span>
                        </div>
                        <div class="event-detail">
                            <i class="fas fa-clock"></i>
                            <span>${formatTime(event.startTime) || "לא צוין"}</span>
                        </div>
                        <div class="event-detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${event.location || "לא צוין"}</span>
                        </div>
                        <div class="event-detail">
                            <i class="fas fa-users"></i>
                            <span>${event.participantCount || 0} משתתפים</span>
                        </div>
                    </div>
                    <div class="event-actions">
                        <button class="btn-event-action btn-view" onclick="viewEvent(${event.id})">
                            <i class="fas fa-eye"></i> צפה בפרטים
                        </button>
                        ${event.status === 'APPROVED' || event.status === 'CONFIRMED' ? `
                            <button class="btn-event-action btn-send-message" onclick="openMessageModalForEvent(${event.id})">
                                <i class="fas fa-envelope"></i> שלח הודעה
                            </button>
                            <button class="btn-event-action btn-primary-action" data-event-id="${event.id}" onclick="openQuoteModalForEvent(this)">
                                <i class="fas fa-calculator"></i> צור הצעת מחיר
                            </button>
                        ` : ''}
                        <button class="btn-event-action btn-danger-action" data-event-id="${event.id}" onclick="deleteEvent(this)">
                            <i class="fas fa-trash"></i> מחק
                        </button>
                    </div>
                </div>
            `;
        }
    }).join('');
}

function getStatusText(status) {
    const statusMap = {
        "DRAFT": "טיוטה",
        "QUOTE_PENDING": "ממתין להצעת מחיר",
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
    
    const modalElement = document.getElementById('messageModal');
    if (!modalElement) {
        console.error('Message modal element not found');
        return;
    }
    
    selectedEventId = eventId;
    resetMessageWizard();
    
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not loaded');
        return;
    }
    
    try {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        loadEventsForMessage();
        // Auto-select the event
        setTimeout(() => {
            const selectEl = document.getElementById('selectedEvent');
            if (selectEl) {
                selectEl.value = eventId;
                nextStep(2);
            }
        }, 100);
    } catch (err) {
        console.error('Error showing message modal:', err);
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
    const request = document.getElementById('aiMessageRequest').value;
    if (!request.trim()) {
        alert("אנא תאר מה אתה רוצה לשלוח");
        return;
    }

    const token = getToken();
    if (!token) return;

    try {
        // Show loading
        const contentOptions = document.getElementById('contentOptions');
        contentOptions.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> יוצר תוכן...</div>';
        contentOptions.style.display = 'block';

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

function displayContentOptions(options) {
    const grid = document.getElementById('contentOptionsGrid');
    grid.innerHTML = options.map((option, index) => `
        <div class="option-card" onclick="selectContentOption(${index}, '${option.replace(/'/g, "\\'")}')">
            <h6>אופציה ${index + 1}</h6>
            <div class="option-preview">${option}</div>
        </div>
    `).join('');

    document.getElementById('contentOptions').style.display = 'block';
}

function selectContentOption(index, content) {
    selectedContentOption = { index, content };
    
    // Update selected state
    document.querySelectorAll('#contentOptionsGrid .option-card').forEach((card, i) => {
        if (i === index) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // Show design options if not shown
    if (!document.getElementById('designOptions').style.display || 
        document.getElementById('designOptions').style.display === 'none') {
        generateDesignOptions();
    }
}

function generateDesignOptions() {
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

    const grid = document.getElementById('designOptionsGrid');
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

    document.getElementById('designOptions').style.display = 'block';
}

function selectDesignOption(index) {
    selectedDesignOption = index;
    
    document.querySelectorAll('#designOptionsGrid .option-card').forEach((card, i) => {
        if (i === index) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // Show continue button
    if (selectedContentOption && selectedDesignOption !== null) {
        document.getElementById('continueToSend').style.display = 'block';
        updateMessagePreview();
    }
}

function updateMessagePreview() {
    const event = currentEvents.find(e => e.id === selectedEventId);
    const preview = document.getElementById('messagePreview');
    
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

    const sendEmail = document.getElementById('sendEmail').checked;
    const sendSMS = document.getElementById('sendSMS').checked;

    if (!sendEmail && !sendSMS) {
        alert("אנא בחר לפחות דרך שליחה אחת");
        return;
    }

    const participants = document.getElementById('participantsList').value;
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

