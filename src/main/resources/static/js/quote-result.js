/*********************************
 * CONFIG
 * Note: API_BASE is loaded from config.js
 *********************************/
// API_BASE is defined in config.js (loaded before this file)
const QUOTES_URL = `${API_BASE}/quotes`;
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
            ${quote.breakdown ? `
                <div class="detail-row">
                    <span class="detail-label">מחיר למשתתף:</span>
                    <span class="detail-value">₪${quote.breakdown.pricePerParticipant || (quote.quoteAmount && quote.participantCount ? (quote.quoteAmount / quote.participantCount).toFixed(2) : '0')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">מחיר בסיס (${quote.participantCount || 0} משתתפים):</span>
                    <span class="detail-value">₪${quote.breakdown.basePrice || quote.quoteAmount || 0}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">עמלה (10%):</span>
                    <span class="detail-value">₪${quote.breakdown.commission || 0}</span>
                </div>
            ` : (quote.quoteAmount ? `
                <div class="detail-row">
                    <span class="detail-label">מחיר למשתתף:</span>
                    <span class="detail-value">₪${quote.participantCount ? (quote.quoteAmount / quote.participantCount).toFixed(2) : '0'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">מחיר בסיס (${quote.participantCount || 0} משתתפים):</span>
                    <span class="detail-value">₪${quote.quoteAmount}</span>
                </div>
            ` : '')}
        ` : ''}
        <div class="price-section">
            <div class="price-label">${isEstimate ? 'הערכת מחיר כוללת' : 'מחיר סופי'}</div>
            <div class="price-amount">₪${quote.totalPrice || quote.price || quote.quoteAmount || 0}</div>
            ${isEstimate ? '<div class="price-note">(הערכה בלבד - המחיר הסופי ייקבע לאחר אישור החברה)</div>' : ''}
        </div>
    `;
}

/*********************************
 * APPROVE QUOTE (Send to Manager)
 *********************************/
function approveQuote() {
    if (!currentQuote || !currentQuote.id) {
        alert("אין הצעה לאישור");
        return;
    }
    
    // Open representatives modal to get number of representatives needed
    // Then send to manager for approval
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
 * Note: This is now just for sending to manager, not for approval
 *********************************/
async function handleRepresentativesSubmit(e) {
    e.preventDefault();

    const token = getToken();
    if (!token) {
        alert("אנא התחבר תחילה");
        return;
    }

    if (!currentQuote || !currentQuote.id) {
        console.error("=== MISSING QUOTE ID ===");
        console.error("Current quote:", currentQuote);
        console.error("Quote ID:", currentQuote?.id);
        console.error("=== END ===");
        alert("אין הצעה לאישור. אנא חזור לדשבורד ונסה שוב.");
        return;
    }
    
    console.log("=== SENDING QUOTE TO MANAGER ===");
    console.log("Quote ID:", currentQuote.id);
    console.log("Quote status:", currentQuote.status);
    console.log("Full quote:", JSON.stringify(currentQuote, null, 2));
    console.log("=== END ===");

    // Note: representativesCount is collected but not sent to backend
    // The backend endpoint doesn't require it - it's just for user information
    const representativesCount = parseInt(document.getElementById('representativesCount').value);
    if (!representativesCount || representativesCount < 1) {
        alert("אנא הזן מספר נציגים תקין");
        return;
    }

    try {
        // Build the URL
        const url = `${CLIENT_QUOTE_REQUESTS_URL}/${currentQuote.id}/send`;
        console.log("=== FETCH REQUEST ===");
        console.log("URL:", url);
        console.log("CLIENT_QUOTE_REQUESTS_URL:", CLIENT_QUOTE_REQUESTS_URL);
        console.log("API_BASE:", API_BASE);
        console.log("Quote ID:", currentQuote.id);
        console.log("Method: POST");
        console.log("=== END FETCH REQUEST ===");
        
        // Send quote to manager for approval (no body needed)
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (res.status === 401) {
            alert("פג תוקף ההתחברות. אנא התחבר שוב.");
            window.location.href = "/login.html";
            return;
        }

        if (!res.ok) {
            let errorText = "שגיאה בשליחת ההצעה למנהל";
            try {
                const errorJson = await res.json();
                console.error("=== SERVER ERROR RESPONSE ===");
                console.error("Status:", res.status);
                console.error("Status Text:", res.statusText);
                console.error("Error JSON:", JSON.stringify(errorJson, null, 2));
                console.error("=== END SERVER ERROR ===");
                
                errorText = errorJson.message || errorJson.error || errorText;
                
                // Add more context based on status code
                if (res.status === 404) {
                    errorText = "הצעת המחיר לא נמצאה. ייתכן שהיא נמחקה או שאין לך הרשאה לגשת אליה.";
                } else if (res.status === 400) {
                    errorText = "לא ניתן לשלוח את ההצעה למנהל. ייתכן שההצעה כבר נשלחה או שהיא במצב שלא מאפשר שליחה.";
                } else if (res.status === 403) {
                    errorText = "אין לך הרשאה לשלוח הצעה זו למנהל.";
                }
            } catch (e) {
                try {
                    const text = await res.text();
                    console.error("Error response text:", text);
                    if (text) {
                        errorText = text;
                    } else {
                        errorText = `שגיאה ${res.status}: ${res.statusText}`;
                    }
                } catch (textErr) {
                    errorText = `שגיאה ${res.status}: ${res.statusText}`;
                }
            }
            throw new Error(errorText);
        }

        // Close modal
        const repsModalEl = document.getElementById('representativesModal');
        const repsModal = bootstrap.Modal.getInstance(repsModalEl);
        if (repsModal) {
            repsModal.hide();
        }

        // Get the updated quote from response
        const updatedQuote = await res.json();
        console.log("=== QUOTE SENT TO MANAGER ===");
        console.log("Updated quote:", updatedQuote);
        console.log("=== END RESPONSE ===");
        
        // Show success message
        alert("ההצעה נשלחה למנהל בהצלחה! תקבל עדכון ברגע שהמנהל יאשר את ההצעה.");

        // Clear quote and redirect to dashboard
        sessionStorage.removeItem('lastQuote');
        // Add flag to refresh events when returning to dashboard
        sessionStorage.setItem('refreshEvents', 'true');
        window.location.href = '/client-dashboard.html';
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

