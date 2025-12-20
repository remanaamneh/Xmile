/*********************************
 * CONFIG
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

    // Load approved quote data from sessionStorage
    const approvedQuoteJson = sessionStorage.getItem('approvedQuote');
    if (!approvedQuoteJson) {
        // If no approved quote, redirect to dashboard
        window.location.href = '/client-dashboard.html';
        return;
    }

    try {
        const approvedQuote = JSON.parse(approvedQuoteJson);
        displaySuccessDetails(approvedQuote);
    } catch (err) {
        console.error("Error parsing approved quote:", err);
        window.location.href = '/client-dashboard.html';
    }
});

/*********************************
 * DISPLAY SUCCESS DETAILS
 *********************************/
function displaySuccessDetails(approvedQuote) {
    const detailsEl = document.getElementById('successDetails');
    if (!detailsEl) return;

    detailsEl.innerHTML = `
        <div class="detail-item">
            <span class="detail-item-label">שם האירוע:</span>
            <span class="detail-item-value">${approvedQuote.eventName || ''}</span>
        </div>
        <div class="detail-item">
            <span class="detail-item-label">מספר נציגי רישום:</span>
            <span class="detail-item-value">${approvedQuote.representativesCount || 0}</span>
        </div>
        <div class="detail-item">
            <span class="detail-item-label">מספר הצעת מחיר:</span>
            <span class="detail-item-value">#${approvedQuote.quoteId || ''}</span>
        </div>
    `;
}

/*********************************
 * NAVIGATION
 *********************************/
function goToDashboard() {
    sessionStorage.removeItem('approvedQuote');
    window.location.href = '/client-dashboard.html';
}

