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

    // Get eventId from URL parameter and set it in the hidden field
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId');
    const eventIdField = document.getElementById('eventId');
    if (eventIdField && eventId) {
        eventIdField.value = eventId;
        console.log("Event ID from URL:", eventId);
    } else if (!eventId) {
        console.warn("No eventId in URL. Quote creation requires an eventId.");
        // You might want to redirect to event selection or show an error
        // For now, we'll let the form submission handle the error
    }

    initializeTimeSelectors();
    loadProductionCompanies();
    setupForm();
    setupProductionCompanyToggle();
});

/*********************************
 * TIME SELECTORS
 *********************************/
function initializeTimeSelectors() {
    const hourSelect = document.getElementById('eventHour');
    const minuteSelect = document.getElementById('eventMinute');
    
    if (!hourSelect || !minuteSelect) return;
    
    // Populate hours (00-23)
    for (let h = 0; h < 24; h++) {
        const hour = h.toString().padStart(2, '0');
        const option = document.createElement('option');
        option.value = hour;
        option.textContent = hour;
        hourSelect.appendChild(option);
    }
    
    // Populate minutes (00, 15, 30, 45)
    const minuteOptions = ['00', '15', '30', '45'];
    minuteOptions.forEach(min => {
        const option = document.createElement('option');
        option.value = min;
        option.textContent = min;
        minuteSelect.appendChild(option);
    });
}

/*********************************
 * FORM SETUP
 *********************************/
function setupForm() {
    const form = document.getElementById('quoteForm');
    if (form) {
        form.addEventListener('submit', handleQuoteSubmit);
    }
}

/*********************************
 * PRODUCTION COMPANIES
 *********************************/
let productionCompanies = [];

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
            productionCompanies = await res.json();
            updateProductionCompanySelect();
        }
    } catch (err) {
        console.error("Error loading production companies:", err);
    }
}

function updateProductionCompanySelect() {
    const selectEl = document.getElementById('productionCompany');
    if (selectEl && productionCompanies.length > 0) {
        selectEl.innerHTML = '<option value="">בחר חברת הפקה...</option>' +
            productionCompanies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
}

/*********************************
 * PRODUCTION COMPANY TOGGLE
 *********************************/
function setupProductionCompanyToggle() {
    const yesRadio = document.getElementById('hasProductionCompanyYes');
    const noRadio = document.getElementById('hasProductionCompanyNo');
    const companyRow = document.getElementById('productionCompanyRow');
    const companySelect = document.getElementById('productionCompany');
    
    if (!yesRadio || !noRadio || !companyRow || !companySelect) return;
    
    function toggleCompanySelect() {
        if (yesRadio.checked) {
            // אם יש לו חברת הפקה - לא להציג רשימה (לדלג)
            companyRow.style.display = 'none';
            companySelect.required = false;
            companySelect.value = '';
        } else if (noRadio.checked) {
            // אם אין לו - להציג רשימה אופציונלית
            companyRow.style.display = 'block';
            companySelect.required = false; // Optional
        }
    }
    
    yesRadio.addEventListener('change', toggleCompanySelect);
    noRadio.addEventListener('change', toggleCompanySelect);
}

/*********************************
 * QUOTE SUBMIT
 *********************************/
async function handleQuoteSubmit(e) {
    e.preventDefault();
    console.log("Quote form submitted - starting quote request");

    const token = getToken();
    if (!token) {
        alert("אנא התחבר תחילה");
        window.location.href = "/login.html";
        return;
    }

    // Validate form - check HTML5 validation FIRST
    const form = document.getElementById('quoteForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Get ALL form values BEFORE checking eventId (needed for event creation)
    const participantCountStr = document.getElementById('participantCount').value.trim();
    const eventName = document.getElementById('eventName') ? document.getElementById('eventName').value.trim() : '';
    const eventLocation = document.getElementById('eventLocation') ? document.getElementById('eventLocation').value.trim() : '';
    const eventDate = document.getElementById('eventDate') ? document.getElementById('eventDate').value : '';
    const eventHour = document.getElementById('eventHour') ? document.getElementById('eventHour').value : '';
    const eventMinute = document.getElementById('eventMinute') ? document.getElementById('eventMinute').value : '';
    
    // Get eventId from URL parameter or hidden field
    const urlParams = new URLSearchParams(window.location.search);
    let eventId = urlParams.get('eventId');
    if (!eventId) {
        const eventIdField = document.getElementById('eventId');
        eventId = eventIdField ? eventIdField.value : null;
    }
    
    // Parse eventId to number
    let eventIdNum = null;
    if (eventId) {
        eventIdNum = Number(eventId);
        if (isNaN(eventIdNum) || eventIdNum <= 0) {
            console.warn("Invalid eventId, ignoring it:", eventId);
            eventIdNum = null;
        }
    }
    
    // If eventId is missing, try to create a new event first
    if (!eventIdNum) {
        console.log("No eventId found. Attempting to create a new event first...");
        
        // Validate required event fields
        if (!eventName || !eventLocation || !eventDate || !eventHour || !eventMinute) {
            alert("שגיאה: כדי ליצור אירוע חדש, נדרש למלא את כל השדות הבאים:\n" +
                  "- שם האירוע\n" +
                  "- מיקום האירוע\n" +
                  "- תאריך האירוע\n" +
                  "- שעת התחלה\n\n" +
                  "או חזור לדשבורד ובחר אירוע קיים.");
            return;
        }
        
        // Validate participantCount for event creation
        if (!participantCountStr || participantCountStr.length === 0) {
            alert("שגיאה: מספר משתתפים הוא שדה חובה ליצירת אירוע.");
            return;
        }
        
        const participantCountForEvent = Number(participantCountStr);
        if (isNaN(participantCountForEvent) || participantCountForEvent < 1) {
            alert("שגיאה: מספר משתתפים חייב להיות מספר חיובי (לפחות 1).");
            return;
        }
        
        // Create event first
        try {
            const eventData = {
                name: eventName,
                location: eventLocation,
                eventDate: eventDate,
                startTime: `${eventHour}:${eventMinute}:00`,
                participantCount: participantCountForEvent
            };
            
            console.log("Creating new event:", eventData);
            
            const eventRes = await fetch(`${API_BASE}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(eventData)
            });
            
            if (!eventRes.ok) {
                const errorJson = await eventRes.json().catch(() => ({}));
                throw new Error(errorJson.message || errorJson.error || "שגיאה ביצירת אירוע חדש");
            }
            
            const newEvent = await eventRes.json();
            eventIdNum = newEvent.id;
            console.log("Event created successfully. New eventId:", eventIdNum);
            
        } catch (err) {
            console.error("Error creating event:", err);
            alert("שגיאה ביצירת אירוע חדש:\n" + err.message + "\n\nאנא נסה שוב או חזור לדשבורד ובחר אירוע קיים.");
            return;
        }
    }
    
    console.log("EventId validated:", eventIdNum);
    
    // Get remaining form values (participantCountStr already read above)
    const notes = document.getElementById('eventNotes') ? (document.getElementById('eventNotes').value || '').trim() : '';
    const hasProductionCompany = document.querySelector('input[name="hasProductionCompany"]:checked');
    const productionCompanyIdStr = document.getElementById('productionCompany') ? document.getElementById('productionCompany').value : null;
    
    // Get requestedWorkers (default to 0)
    const requestedWorkersStr = document.getElementById('requestedWorkers') ? document.getElementById('requestedWorkers').value.trim() : '0';

    // Validate participantCount (if not already validated during event creation)
    if (!participantCountStr || participantCountStr.length === 0) {
        alert("שגיאה: מספר משתתפים הוא שדה חובה.");
        return;
    }
    
    const participantCount = Number(participantCountStr);
    if (isNaN(participantCount) || participantCount < 1) {
        alert("שגיאה: מספר משתתפים חייב להיות מספר חיובי (לפחות 1).");
        return;
    }
    
    // Parse numbers with defensive parsing (participantCount already validated above)
    const requestedWorkers = Number(requestedWorkersStr) || 0;
    
    // Parse productionCompanyId only if user selected "no" (wants company suggestions)
    // If user selected "yes" (has their own company), don't send productionCompanyId
    let productionCompanyId = null;
    if (hasProductionCompany && hasProductionCompany.value === 'no' && productionCompanyIdStr) {
        const parsedId = Number(productionCompanyIdStr);
        if (!isNaN(parsedId) && parsedId > 0) {
            productionCompanyId = parsedId;
        }
    }
    
    // Build request payload with ONLY the required fields
    // eventIdNum is already validated above
    const quoteData = {
        eventId: eventIdNum,
        participantCount: participantCount,
        requestedWorkers: requestedWorkers,
        notes: notes.length > 0 ? notes : null,
        productionCompanyId: productionCompanyId
    };
    
    console.log("=== QUOTE REQUEST DATA ===");
    console.log("Sending to POST /quotes:");
    console.log(JSON.stringify(quoteData, null, 2));
    console.log("=== END QUOTE REQUEST DATA ===");

    // Show loading
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }

    try {
        // Send to POST /quotes endpoint
        const res = await fetch(QUOTES_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(quoteData)
        });

        if (res.status === 401) {
            alert("פג תוקף ההתחברות. אנא התחבר שוב.");
            window.location.href = "/login.html";
            return;
        }

        if (!res.ok) {
            let errorText = "שגיאה ביצירת הצעת מחיר";
            try {
                const errorJson = await res.json();
                console.error("=== SERVER ERROR RESPONSE ===");
                console.error("Status:", res.status);
                console.error("Status Text:", res.statusText);
                console.error("Error JSON:", JSON.stringify(errorJson, null, 2));
                console.error("=== END SERVER ERROR ===");
                
                // Handle validation errors
                if (errorJson.errors && typeof errorJson.errors === 'object') {
                    const fieldErrors = Object.entries(errorJson.errors)
                        .map(([field, msg]) => `${field}: ${msg}`)
                        .join(', ');
                    errorText = errorJson.message || `שגיאות אימות: ${fieldErrors}`;
                } else if (errorJson.message) {
                    errorText = errorJson.message;
                } else if (errorJson.error) {
                    errorText = errorJson.error;
                    // If error is just "שגיאה", try to get more details
                    if (errorText === "שגיאה" && errorJson.type) {
                        errorText = `שגיאה: ${errorJson.type}`;
                        if (errorJson.cause) {
                            errorText += ` - ${errorJson.cause}`;
                        }
                    }
                } else if (errorJson.type) {
                    errorText = `${errorJson.type}: ${errorJson.error || errorJson.message || 'שגיאה לא ידועה'}`;
                    if (errorJson.cause) {
                        errorText += ` (סיבה: ${errorJson.cause})`;
                    }
                } else if (typeof errorJson === 'object') {
                    // Handle old format (direct field errors)
                    const fieldErrors = Object.entries(errorJson)
                        .map(([field, msg]) => `${field}: ${msg}`)
                        .join(', ');
                    errorText = `שגיאות אימות: ${fieldErrors}`;
                }
            } catch (e) {
                try {
                    const text = await res.text();
                    console.error("Error response text:", text);
                    if (text) errorText = text;
                } catch (textErr) {
                    errorText = `שגיאה ${res.status}: ${res.statusText}`;
                }
            }
            
            // Hide loading before throwing error
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            throw new Error(errorText);
        }

        const quote = await res.json();
        
        console.log("Quote received:", quote);
        
        // Hide loading
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }

        // Store quote in sessionStorage and navigate to quote result page
        sessionStorage.setItem('lastQuote', JSON.stringify(quote));
        
        // Navigate to quote result page where user can approve and send to manager
        window.location.href = '/quote-result.html';
        
    } catch (err) {
        // Hide loading
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        // Show detailed error message
        let errorMessage = err.message || "שגיאה לא ידועה";
        
        // If error message is too generic, provide more context
        if (errorMessage === "שגיאה ביצירת הצעת מחיר" || errorMessage.includes("Error creating quote")) {
            errorMessage = "שגיאה ביצירת הצעת מחיר.\n\nאנא בדוק:\n1. שכל השדות המסומנים ב-* מלאים\n2. שהתאריך והשעה תקינים\n3. את ה-Console (F12) לפרטים נוספים";
        }
        
        // Log full error to console for debugging
        console.error("=== FULL ERROR DETAILS ===");
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        console.error("Error name:", err.name);
        console.error("Full error object:", err);
        console.error("=== END ERROR DETAILS ===");
        
        alert(errorMessage);
    }
}

/*********************************
 * DISPLAY QUOTE IN MODAL
 *********************************/
function displayQuoteInModal(quote) {
    const modalContent = document.getElementById('quoteResultContent');
    if (!modalContent) return;
    
    const formatDate = (dateString) => {
        if (!dateString) return "לא צוין";
        const d = new Date(dateString);
        if (isNaN(d)) return "לא צוין";
        return d.toLocaleDateString("he-IL", { year: "numeric", month: "short", day: "numeric" });
    };
    
    const formatTime = (timeString) => {
        if (!timeString) return "לא צוין";
        return timeString.substring(0, 5);
    };
    
    const isEstimate = quote.status === 'submitted';
    const breakdown = quote.breakdown || {};
    
    let html = `
        <div class="quote-result-content">
            ${quote.eventName ? `
                <div class="quote-detail-row">
                    <span class="quote-detail-label">שם האירוע:</span>
                    <span class="quote-detail-value">${quote.eventName}</span>
                </div>
            ` : ''}
            <div class="quote-detail-row">
                <span class="quote-detail-label">מספר משתתפים:</span>
                <span class="quote-detail-value">${quote.participantCount || 0}</span>
            </div>
            ${quote.location ? `
                <div class="quote-detail-row">
                    <span class="quote-detail-label">מיקום:</span>
                    <span class="quote-detail-value">${quote.location}</span>
                </div>
            ` : ''}
            ${quote.eventDate ? `
                <div class="quote-detail-row">
                    <span class="quote-detail-label">תאריך:</span>
                    <span class="quote-detail-value">${formatDate(quote.eventDate)}</span>
                </div>
            ` : ''}
            ${quote.startTime ? `
                <div class="quote-detail-row">
                    <span class="quote-detail-label">שעת התחלה:</span>
                    <span class="quote-detail-value">${formatTime(quote.startTime)}</span>
                </div>
            ` : ''}
            ${breakdown.isDateAvailable !== undefined ? `
                <div class="quote-detail-row ${breakdown.isDateAvailable ? 'date-available' : 'date-unavailable'}">
                    <span class="quote-detail-label">זמינות תאריך:</span>
                    <span class="quote-detail-value">
                        <i class="fas ${breakdown.isDateAvailable ? 'fa-check-circle text-success' : 'fa-exclamation-triangle text-warning'}"></i>
                        ${breakdown.dateAvailabilityMessage || (breakdown.isDateAvailable ? 'התאריך פנוי!' : 'יש אירועים אחרים בתאריך זה')}
                    </span>
                </div>
            ` : ''}
            ${breakdown.pricePerParticipant || (quote.quoteAmount && quote.participantCount) ? `
                <div class="quote-detail-row">
                    <span class="quote-detail-label">מחיר למשתתף:</span>
                    <span class="quote-detail-value">₪${breakdown.pricePerParticipant || (quote.quoteAmount && quote.participantCount ? (quote.quoteAmount / quote.participantCount).toFixed(2) : '0')}</span>
                </div>
            ` : ''}
            ${breakdown.basePrice || quote.quoteAmount ? `
                <div class="quote-detail-row">
                    <span class="quote-detail-label">מחיר בסיס (${quote.participantCount || 0} משתתפים):</span>
                    <span class="quote-detail-value">₪${breakdown.basePrice || quote.quoteAmount || 0}</span>
                </div>
            ` : ''}
            ${breakdown.commission ? `
                <div class="quote-detail-row">
                    <span class="quote-detail-label">עמלה (10%):</span>
                    <span class="quote-detail-value">₪${breakdown.commission}</span>
                </div>
            ` : ''}
            <div class="quote-price-section">
                <div class="quote-price-label">${isEstimate ? 'הערכת מחיר כוללת' : 'מחיר סופי'}</div>
                <div class="quote-price-amount">₪${quote.totalPrice || quote.price || quote.quoteAmount || 0}</div>
                ${isEstimate ? '<div class="quote-price-note">(הערכה בלבד - המחיר הסופי ייקבע לאחר אישור החברה)</div>' : ''}
            </div>
        </div>
    `;
    
    modalContent.innerHTML = html;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('quoteResultModal'));
    modal.show();
    
    // Store quote for approval
    window.currentQuote = quote;
    
    // Setup approve button
    const approveBtn = document.getElementById('approveQuoteBtn');
    if (approveBtn) {
        approveBtn.onclick = () => {
            modal.hide();
            // Redirect to approval page or open representatives modal
            sessionStorage.setItem('lastQuote', JSON.stringify(quote));
            // Add flag to refresh events when returning to dashboard
            sessionStorage.setItem('refreshEvents', 'true');
            window.location.href = '/quote-result.html';
        };
    }
}

/*********************************
 * NAVIGATION
 *********************************/
function goBack() {
    window.location.href = '/client-dashboard.html';
}

