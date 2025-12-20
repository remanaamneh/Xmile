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

    // Validate form - check HTML5 validation first
    const form = document.getElementById('quoteForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Get form values
    const eventName = document.getElementById('eventName').value.trim();
    const participantCountStr = document.getElementById('participantCount').value.trim();
    const location = document.getElementById('eventLocation').value; // Don't trim here - allow any text including spaces
    const eventDate = document.getElementById('eventDate').value;
    const eventHour = document.getElementById('eventHour').value;
    const eventMinute = document.getElementById('eventMinute').value;
    const hasProductionCompany = document.querySelector('input[name="hasProductionCompany"]:checked');
    const productionCompanyId = document.getElementById('productionCompany').value || null;
    const notes = document.getElementById('eventNotes').value; // Don't trim - allow any text

    // Only participant count is required
    const errors = [];
    
    if (!participantCountStr || participantCountStr.length === 0) {
        errors.push("מספר משתתפים (חובה)");
    } else {
        const participantCount = parseInt(participantCountStr);
        if (isNaN(participantCount) || participantCount < 1) {
            errors.push("מספר משתתפים (חייב להיות מספר חיובי)");
        }
    }
    
    if (errors.length > 0) {
        alert("אנא מלא את השדות הבאים:\n" + errors.join("\n"));
        return;
    }
    
    // Parse participant count after validation
    const participantCount = parseInt(participantCountStr);
    
    // Location can be any text, trim if provided
    const locationTrimmed = location ? location.trim() : '';
    
    // If date or time are provided, validate them
    if (eventDate && eventDate.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
        alert("תאריך לא תקין. אנא בחר תאריך תקין או השאר ריק");
        return;
    }
    
    // Format time if provided (HH:mm:ss)
    let formattedTime = null;
    
    // Check if time is provided - both hour and minute must be selected or both empty
    const hasHour = eventHour && eventHour.length > 0 && eventHour !== '' && eventHour !== 'שעה';
    const hasMinute = eventMinute && eventMinute.length > 0 && eventMinute !== '' && eventMinute !== 'דקות';
    
    if (hasHour || hasMinute) {
        // If one is provided, both must be provided
        if (!hasHour || !hasMinute) {
            alert("אנא בחר גם שעה וגם דקות, או השאר את שני השדות ריקים");
            return;
        }
        
        // Validate hour and minute are numbers
        const hourNum = parseInt(eventHour);
        const minuteNum = parseInt(eventMinute);
        
        if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
            alert("שעה לא תקינה. אנא בחר שעה בין 00 ל-23");
            return;
        }
        if (isNaN(minuteNum) || minuteNum < 0 || minuteNum > 59) {
            alert("דקות לא תקינות. אנא בחר דקות בין 00 ל-59");
            return;
        }
        
        // Format as HH:mm:ss (hour:minute:second)
        formattedTime = `${String(hourNum).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}:00`;
        console.log("Time formatted:", formattedTime, "from hour:", eventHour, "minute:", eventMinute);
    }

    const quoteData = {
        eventName: eventName && eventName.trim().length > 0 ? eventName.trim() : null,
        participantCount: participantCount,
        location: locationTrimmed.length > 0 ? locationTrimmed : null,
        eventDate: eventDate && eventDate.length > 0 ? eventDate : null,
        startTime: formattedTime,
        // אם יש לו חברת הפקה (yes) - לא שולחים productionCompanyId (null)
        // אם אין לו (no) - שולחים את הבחירה האופציונלית
        productionCompanyId: hasProductionCompany && hasProductionCompany.value === 'no' && productionCompanyId ? parseInt(productionCompanyId) : null,
        notes: notes && notes.trim().length > 0 ? notes.trim() : null // Only send notes if not empty
    };
    
    console.log("=== QUOTE REQUEST DATA ===");
    console.log("Form values:");
    console.log("  eventName:", eventName);
    console.log("  participantCount:", participantCount, "(type:", typeof participantCount, ")");
    console.log("  location:", location);
    console.log("  eventDate:", eventDate);
    console.log("  eventHour:", eventHour);
    console.log("  eventMinute:", eventMinute);
    console.log("  formattedTime:", formattedTime);
    console.log("  hasProductionCompany:", hasProductionCompany ? hasProductionCompany.value : "NOT SELECTED");
    console.log("  productionCompanyId:", productionCompanyId);
    console.log("Sending quote request:", JSON.stringify(quoteData, null, 2));
    console.log("=== END QUOTE REQUEST DATA ===");

    // Show loading
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }

    try {
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

        // Display quote in modal
        displayQuoteInModal(quote);
        
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
            ${breakdown.pricePerParticipant ? `
                <div class="quote-detail-row">
                    <span class="quote-detail-label">מחיר למשתתף:</span>
                    <span class="quote-detail-value">₪${breakdown.pricePerParticipant}</span>
                </div>
            ` : ''}
            ${breakdown.basePrice ? `
                <div class="quote-detail-row">
                    <span class="quote-detail-label">מחיר בסיס (${quote.participantCount || 0} משתתפים):</span>
                    <span class="quote-detail-value">₪${breakdown.basePrice}</span>
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
                <div class="quote-price-amount">₪${quote.totalPrice || quote.price || 0}</div>
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

