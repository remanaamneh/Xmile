// API_BASE should be loaded from config.js (loaded before this file)
// Fallback if config.js is not loaded
const API_BASE = typeof API_BASE !== 'undefined' ? API_BASE : (window.API_BASE || 'http://localhost:8080');
console.log('Manager Dashboard - API_BASE:', API_BASE);

let authToken = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== MANAGER DASHBOARD INIT ===');
    console.log('API_BASE:', API_BASE);
    
    // Check authentication
    authToken = localStorage.getItem('token');
    console.log('Auth token exists:', !!authToken);
    
    if (!authToken) {
        console.log('No token found, redirecting to login');
        window.location.href = '/login.html';
        return;
    }

    // Load pending quotes
    loadPendingQuotes();

    // Setup event listeners
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('Logout button listener attached');
    } else {
        console.error('Logout button not found!');
    }
    
    const saveFinalPriceBtn = document.getElementById('saveFinalPriceBtn');
    if (saveFinalPriceBtn) {
        saveFinalPriceBtn.addEventListener('click', handleFinalizeQuote);
    }
    
    const sendToWorkersBtn = document.getElementById('sendToWorkersBtn');
    if (sendToWorkersBtn) {
        sendToWorkersBtn.addEventListener('click', handleSendToWorkers);
    }
    
    const sendWorkerRequestBtn = document.getElementById('sendWorkerRequestBtn');
    if (sendWorkerRequestBtn) {
        sendWorkerRequestBtn.addEventListener('click', handleCreateWorkerRequest);
    }
    
    console.log('=== END MANAGER DASHBOARD INIT ===');
});

async function loadPendingQuotes() {
    try {
        console.log('=== LOADING PENDING QUOTES ===');
        console.log('URL:', `${API_BASE}/admin/quote-requests?status=MANAGER_REVIEW`);
        console.log('Token exists:', !!authToken);
        
        // Use the new /admin/quote-requests endpoint with status filter
        // Request quotes with MANAGER_REVIEW status (includes SENT_TO_MANAGER and submitted)
        const response = await fetch(`${API_BASE}/admin/quote-requests?status=MANAGER_REVIEW`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to load quotes: ${response.status} - ${errorText}`);
        }

        const quotes = await response.json();
        console.log('Quotes received:', quotes.length);
        console.log('Quotes data:', quotes);
        displayQuotes(quotes);
    } catch (error) {
        console.error('=== ERROR LOADING QUOTES ===');
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('=== END ERROR ===');
        
        const quotesLoading = document.getElementById('quotesLoading');
        if (quotesLoading) {
            quotesLoading.style.display = 'none';
        }
        
        const quotesList = document.getElementById('quotesList');
        if (quotesList) {
            quotesList.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i> שגיאה בטעינת הצעות המחיר: ${error.message}
                    </div>
                </div>
            `;
        }
    }
}

function displayQuotes(quotes) {
    const quotesList = document.getElementById('quotesList');
    const quotesLoading = document.getElementById('quotesLoading');
    const quotesEmpty = document.getElementById('quotesEmpty');

    quotesLoading.style.display = 'none';

    if (!quotes || quotes.length === 0) {
        quotesEmpty.style.display = 'block';
        quotesList.innerHTML = '';
        return;
    }

    quotesEmpty.style.display = 'none';
    quotesList.innerHTML = quotes.map(quote => `
        <div class="col-md-6 col-lg-4">
            <div class="quote-card">
                <div class="quote-header">
                    <h6 class="quote-title">${quote.eventName || 'ללא שם'}</h6>
                    <span class="quote-status status-submitted">${getStatusText(quote.status === 'pending_approval' ? 'submitted' : quote.status)}</span>
                </div>
                ${quote.clientUserName ? `
                    <div class="mb-2">
                        <small class="text-muted">
                            <i class="fas fa-user"></i> לקוח: ${quote.clientUserName}
                            ${quote.clientUserEmail ? ` (${quote.clientUserEmail})` : ''}
                        </small>
                    </div>
                ` : ''}
                <div class="quote-details">
                    ${quote.participantCount ? `
                        <div class="quote-detail-item">
                            <span class="quote-detail-label">מספר משתתפים</span>
                            <span class="quote-detail-value">${quote.participantCount}</span>
                        </div>
                    ` : ''}
                    ${quote.location ? `
                        <div class="quote-detail-item">
                            <span class="quote-detail-label">מיקום</span>
                            <span class="quote-detail-value">${quote.location}</span>
                        </div>
                    ` : ''}
                    ${quote.eventDate ? `
                        <div class="quote-detail-item">
                            <span class="quote-detail-label">תאריך</span>
                            <span class="quote-detail-value">${formatDate(quote.eventDate)}</span>
                        </div>
                    ` : ''}
                    ${quote.startTime ? `
                        <div class="quote-detail-item">
                            <span class="quote-detail-label">שעה</span>
                            <span class="quote-detail-value">${quote.startTime}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="quote-price">
                    ${formatPrice(quote.quoteAmount || quote.price)} ₪
                </div>
                ${quote.workersNeeded ? `
                    <div class="mb-2">
                        <small class="text-muted">
                            <i class="fas fa-users"></i> נציגי רישום נדרשים: ${quote.workersNeeded}
                        </small>
                    </div>
                ` : ''}
                ${quote.notes ? `
                    <div class="mb-2">
                        <small class="text-muted">
                            <i class="fas fa-sticky-note"></i> הערות: ${quote.notes.substring(0, 50)}${quote.notes.length > 50 ? '...' : ''}
                        </small>
                    </div>
                ` : ''}
                <div class="d-flex gap-2">
                    <button class="btn btn-primary btn-sm flex-fill" onclick="openFinalizeModal(${quote.id}, ${JSON.stringify(quote).replace(/"/g, '&quot;')})">
                        <i class="fas fa-check"></i> אישור
                    </button>
                    <button class="btn btn-danger btn-sm flex-fill" onclick="openRejectModal(${quote.id}, ${JSON.stringify(quote).replace(/"/g, '&quot;')})">
                        <i class="fas fa-times"></i> דחייה
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function openFinalizeModal(quoteId, quote) {
    document.getElementById('finalizeQuoteId').value = quoteId;
    document.getElementById('finalPrice').value = quote.quoteAmount || quote.price || '';
    document.getElementById('requiredWorkersCount').value = quote.workersNeeded || quote.requestedWorkers || 1;
    document.getElementById('finalNotes').value = '';
    
    // Display quote details
    const quoteDetails = document.getElementById('quoteDetails');
    quoteDetails.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <strong>שם האירוע:</strong> ${quote.eventName || 'ללא שם'}<br>
                <strong>מספר משתתפים:</strong> ${quote.participantCount || 'לא צוין'}<br>
                <strong>מיקום:</strong> ${quote.location || 'לא צוין'}<br>
                ${quote.clientUserName ? `<strong>לקוח:</strong> ${quote.clientUserName}<br>` : ''}
                ${quote.clientUserEmail ? `<strong>אימייל לקוח:</strong> ${quote.clientUserEmail}<br>` : ''}
            </div>
            <div class="col-md-6">
                <strong>תאריך:</strong> ${quote.eventDate ? formatDate(quote.eventDate) : 'לא צוין'}<br>
                <strong>שעה:</strong> ${quote.startTime || 'לא צוין'}<br>
                <strong>מחיר ראשוני:</strong> ${formatPrice(quote.quoteAmount || quote.price)} ₪<br>
                ${quote.productionCompanyName ? `<strong>חברת הפקה:</strong> ${quote.productionCompanyName}<br>` : ''}
            </div>
        </div>
        ${quote.notes ? `
            <div class="row mt-2">
                <div class="col-12">
                    <strong>הערות:</strong><br>
                    <div class="border p-2 rounded bg-light">${quote.notes}</div>
                </div>
            </div>
        ` : ''}
    `;
    
    document.getElementById('requestedWorkersCount').textContent = quote.workersNeeded || quote.requestedWorkers || 0;
    
    const modal = new bootstrap.Modal(document.getElementById('finalizeQuoteModal'));
    modal.show();
}

function openRejectModal(quoteId, quote) {
    const reason = prompt('אנא הזן סיבת דחייה:', '');
    if (reason && reason.trim()) {
        rejectQuote(quoteId, reason.trim());
    }
}

async function rejectQuote(quoteId, reason) {
    try {
        const response = await fetch(`${API_BASE}/admin/quote-requests/${quoteId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason: reason
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'שגיאה בדחיית הצעת המחיר');
        }

        alert('הצעת המחיר נדחתה בהצלחה!');
        loadPendingQuotes();
    } catch (error) {
        console.error('Error rejecting quote:', error);
        alert('שגיאה: ' + error.message);
    }
}

async function handleFinalizeQuote() {
    const quoteId = document.getElementById('finalizeQuoteId').value;
    const finalPrice = document.getElementById('finalPrice').value;
    const notes = document.getElementById('finalNotes').value;

    if (!finalPrice || parseFloat(finalPrice) <= 0) {
        alert('אנא הזן מחיר סופי תקין');
        return;
    }

    try {
        // Use the new /admin/quote-requests/{id}/approve endpoint
        const response = await fetch(`${API_BASE}/admin/quote-requests/${quoteId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                finalPrice: parseFloat(finalPrice),
                requiredWorkersCount: parseInt(requiredWorkersCount),
                adminNotes: notes
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'שגיאה באישור הצעת המחיר');
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('finalizeQuoteModal'));
        modal.hide();

        const updatedQuote = await response.json();
        console.log('Quote approved:', updatedQuote);
        
        alert('הצעת המחיר אושרה בהצלחה! הצעות עבודה נשלחו לעובדים.');
        loadPendingQuotes();
    } catch (error) {
        console.error('Error finalizing quote:', error);
        alert('שגיאה: ' + error.message);
    }
}

async function handleSendToWorkers() {
    const quoteId = document.getElementById('finalizeQuoteId').value;
    const requestedWorkers = parseInt(document.getElementById('requestedWorkersCount').textContent) || 0;

    if (requestedWorkers <= 0) {
        alert('מספר העובדים הנדרש לא תקין');
        return;
    }

    // First, get the event ID from the quote
    try {
        const quoteResponse = await fetch(`${API_BASE}/quotes/${quoteId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!quoteResponse.ok) {
            throw new Error('Failed to get quote details');
        }

        const quote = await quoteResponse.json();
        const eventId = quote.eventId;

        // Open worker request modal
        document.getElementById('workerRequestEventId').value = eventId;
        document.getElementById('requestedWorkers').value = requestedWorkers;
        
        const finalizeModal = bootstrap.Modal.getInstance(document.getElementById('finalizeQuoteModal'));
        finalizeModal.hide();

        const workerRequestModal = new bootstrap.Modal(document.getElementById('createWorkerRequestModal'));
        workerRequestModal.show();
    } catch (error) {
        console.error('Error getting quote:', error);
        alert('שגיאה בטעינת פרטי האירוע');
    }
}

async function handleCreateWorkerRequest() {
    const eventId = document.getElementById('workerRequestEventId').value;
    const requestedWorkers = parseInt(document.getElementById('requestedWorkers').value);
    const radiusKm = parseFloat(document.getElementById('radiusKm').value) || 50;

    if (!eventId || !requestedWorkers || requestedWorkers <= 0) {
        alert('אנא מלא את כל השדות הנדרשים');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/worker-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                eventId: parseInt(eventId),
                requestedWorkers: requestedWorkers,
                radiusKm: radiusKm
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'שגיאה בשליחת המשימה לעובדים');
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('createWorkerRequestModal'));
        modal.hide();

        alert('המשימה נשלחה לעובדים בהצלחה!');
    } catch (error) {
        console.error('Error creating worker request:', error);
        alert('שגיאה: ' + error.message);
    }
}

function handleLogout() {
    console.log('=== LOGOUT CLICKED ===');
    try {
        localStorage.removeItem('token');
        console.log('Token removed from localStorage');
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error during logout:', error);
        // Force redirect even if there's an error
        window.location.href = '/login.html';
    }
}

function getStatusText(status) {
    const statusMap = {
        'submitted': 'ממתין לאישור',
        'approved': 'אושר',
        'rejected': 'נדחה',
        'cancelled': 'בוטל'
    };
    return statusMap[status] || status;
}

function formatPrice(price) {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('he-IL');
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
}

