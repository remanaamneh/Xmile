/*********************************
 * CONFIG
 * Note: API_BASE is loaded from config.js
 *********************************/
// API_BASE is defined in config.js (loaded before this file)
const QUOTES_URL = `${API_BASE}/quotes`;

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

/*********************************
 * INIT (DOM READY)
 *********************************/
let currentQuote = null;

document.addEventListener("DOMContentLoaded", () => {
    // Check if user is authenticated
    if (!getToken()) {
        alert("אנא התחבר תחילה");
        window.location.href = "/login.html";
        return;
    }

    // Load quote from sessionStorage
    const quoteJson = sessionStorage.getItem('lastQuote');
    console.log("Quote JSON from sessionStorage:", quoteJson);
    
    if (!quoteJson) {
        console.error("No quote found in sessionStorage");
        alert("לא נמצאה הצעת מחיר");
        window.location.href = "/client-dashboard.html";
        return;
    }

    try {
        currentQuote = JSON.parse(quoteJson);
        console.log("Parsed quote:", currentQuote);
        displayQuote(currentQuote);
    } catch (err) {
        console.error("Error parsing quote:", err);
        console.error("Quote JSON that failed:", quoteJson);
        alert("שגיאה בטעינת הצעת המחיר: " + err.message);
        window.location.href = "/client-dashboard.html";
    }

    // Setup representatives form
    const form = document.getElementById('representativesForm');
    if (form) {
        form.addEventListener('submit', handleRepresentativesSubmit);
    }
});

/*********************************
 * DISPLAY QUOTE
 *********************************/
function displayQuote(quote) {
    console.log("Displaying quote:", quote);
    const detailsEl = document.getElementById('quoteDetails');
    if (!detailsEl) {
        console.error("quoteDetails element not found!");
        return;
    }

    const isEstimate = quote.status === 'submitted';
    const estimateNoteEl = document.getElementById('estimateNote');
    
    if (estimateNoteEl) {
        if (isEstimate) {
            estimateNoteEl.style.display = 'block';
        } else {
            estimateNoteEl.style.display = 'none';
        }
    }

    detailsEl.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">שם האירוע:</span>
            <span class="detail-value">${quote.eventName || ''}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">מספר משתתפים:</span>
            <span class="detail-value">${quote.participantCount || 0}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">מיקום:</span>
            <span class="detail-value">${quote.location || ''}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">תאריך:</span>
            <span class="detail-value">${formatDate(quote.eventDate || '')}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">שעת התחלה:</span>
            <span class="detail-value">${formatTime(quote.startTime || '')}</span>
        </div>
        ${quote.productionCompanyName ? `
            <div class="detail-row">
                <span class="detail-label">חברת הפקה:</span>
                <span class="detail-value">${quote.productionCompanyName}</span>
            </div>
        ` : ''}
        ${quote.breakdown ? `
            ${quote.breakdown.isDateAvailable !== undefined ? `
                <div class="detail-row ${quote.breakdown.isDateAvailable ? 'date-available' : 'date-unavailable'}">
                    <span class="detail-label">זמינות תאריך:</span>
                    <span class="detail-value">
                        <i class="fas ${quote.breakdown.isDateAvailable ? 'fa-check-circle text-success' : 'fa-exclamation-triangle text-warning'}"></i>
                        ${quote.breakdown.dateAvailabilityMessage || (quote.breakdown.isDateAvailable ? 'התאריך פנוי!' : 'יש אירועים אחרים בתאריך זה')}
                    </span>
                </div>
            ` : ''}
            <div class="detail-row">
                <span class="detail-label">מחיר למשתתף:</span>
                <span class="detail-value">₪${quote.breakdown.pricePerParticipant || 0}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">מחיר בסיס (${quote.participantCount || 0} משתתפים):</span>
                <span class="detail-value">₪${quote.breakdown.basePrice || 0}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">עמלה (10%):</span>
                <span class="detail-value">₪${quote.breakdown.commission || 0}</span>
            </div>
        ` : ''}
        <div class="price-section">
            <div class="price-label">${isEstimate ? 'הערכת מחיר כוללת' : 'מחיר סופי'}</div>
            <div class="price-amount">₪${quote.totalPrice || quote.price || 0}</div>
            ${isEstimate ? '<div class="price-note">(הערכה בלבד - המחיר הסופי ייקבע לאחר אישור החברה)</div>' : ''}
        </div>
    `;
}

/*********************************
 * APPROVE QUOTE
 *********************************/
function approveQuote() {
    if (!currentQuote || !currentQuote.id) {
        alert("אין הצעה לאישור");
        return;
    }
    
    // Open representatives modal
    const repsModalEl = document.getElementById('representativesModal');
    if (repsModalEl) {
        const modal = new bootstrap.Modal(repsModalEl);
        modal.show();
    } else {
        console.error('Representatives modal not found');
    }
}

/*********************************
 * REJECT QUOTE
 *********************************/
function rejectQuote() {
    if (confirm("האם אתה בטוח שאתה לא רוצה את ההצעה?")) {
        sessionStorage.removeItem('lastQuote');
        window.location.href = '/client-dashboard.html';
    }
}

/*********************************
 * REPRESENTATIVES SUBMIT
 *********************************/
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

        if (res.status === 401) {
            alert("פג תוקף ההתחברות. אנא התחבר שוב.");
            window.location.href = "/login.html";
            return;
        }

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || "שגיאה באישור ההצעה");
        }

        // Close modal
        const repsModalEl = document.getElementById('representativesModal');
        const repsModal = bootstrap.Modal.getInstance(repsModalEl);
        if (repsModal) {
            repsModal.hide();
        }

        // Store quote data for success page
        sessionStorage.setItem('approvedQuote', JSON.stringify({
            quoteId: currentQuote.id,
            eventName: currentQuote.eventName,
            representativesCount: representativesCount
        }));

        // Clear quote and redirect to success page
        sessionStorage.removeItem('lastQuote');
        window.location.href = '/quote-success.html';
    } catch (err) {
        alert("שגיאה: " + err.message);
        console.error(err);
    }
}

/*********************************
 * NAVIGATION
 *********************************/
function goBack() {
    sessionStorage.removeItem('lastQuote');
    window.location.href = '/client-dashboard.html';
}

