/*********************************
 * MANAGER DASHBOARD
 * Handles manager/admin quote approval and management
 * Version: 1.0.6
 *********************************/

console.log('=== MANAGER DASHBOARD JS LOADED ===');
console.log('Version: 1.0.6');
console.log('Timestamp:', new Date().toISOString());

// API_BASE is defined in config.js as window.API_BASE
// Use window.API_BASE directly - DO NOT redeclare
console.log('API_BASE (manager-dashboard):', window.API_BASE);

let authToken = null;

// Global state: all quotes loaded from server
let allQuotes = [];

// Pending statuses that should appear in "בקשות לאישור" tab
const PENDING_STATUSES = ['QUOTE_PENDING', 'SENT_TO_MANAGER', 'MANAGER_REVIEW'];

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== MANAGER DASHBOARD INIT ===');
    console.log('API_BASE:', window.API_BASE);
    
    // Check authentication
    authToken = getToken();
    if (!authToken) {
        console.warn('No token found, redirecting to login');
        alert('פג תוקף התחברות. אנא התחבר שוב.');
        window.location.href = '/login.html';
        return;
    }
    
    console.log('Token exists:', !!authToken);
    console.log('Token length:', authToken ? authToken.length : 0);
    
    // Load all quotes first, then show pending by default
    loadAllQuotes().then(() => {
        loadPendingQuotes();
    });
    
    // Setup tab change listeners
    const pendingTab = document.getElementById('pending-tab');
    if (pendingTab) {
        pendingTab.addEventListener('shown.bs.tab', function() {
            console.log('Pending tab activated');
            loadPendingQuotes();
        });
    }
    
    const historyTab = document.getElementById('history-tab');
    if (historyTab) {
        historyTab.addEventListener('shown.bs.tab', function() {
            console.log('History tab activated');
            loadHistoryQuotes();
        });
    }
    
    const eventsTab = document.getElementById('events-tab');
    if (eventsTab) {
        eventsTab.addEventListener('shown.bs.tab', function() {
            console.log('Events tab activated');
            loadEvents();
        });
    }
    
    const workersTab = document.getElementById('workers-tab');
    if (workersTab) {
        workersTab.addEventListener('shown.bs.tab', function() {
            console.log('Workers tab activated');
            loadWorkers();
        });
    }
    
    // Setup modal buttons
    const saveApproveBtn = document.getElementById('saveApproveBtn');
    if (saveApproveBtn) {
        saveApproveBtn.addEventListener('click', handleApproveQuote);
    }
    
    const saveRejectBtn = document.getElementById('saveRejectBtn');
    if (saveRejectBtn) {
        saveRejectBtn.addEventListener('click', handleRejectQuote);
    }
    
    console.log('=== END MANAGER DASHBOARD INIT ===');
});

/**
 * Load all quotes from server once
 * Uses GET /admin/quote-requests (without status filter) to get all quotes
 */
async function loadAllQuotes() {
    console.log('=== LOADING ALL QUOTES ===');
    console.log('Timestamp:', new Date().toISOString());
    
    try {
        // Get token fresh
        authToken = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!authToken) {
            console.error('No token found in storage');
            alert('פג תוקף התחברות. אנא התחבר שוב.');
            window.location.href = '/login.html';
            return;
        }
        
        // Call GET /admin/quote-requests without status filter to get all quotes
        const url = `${window.API_BASE}/admin/quote-requests`;
        console.log('=== CALLING GET /admin/quote-requests ===');
        console.log('Full URL:', url);
        console.log('Method: GET');
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response received');
        console.log('Status:', response.status);
        console.log('OK:', response.ok);
        
        if (response.status === 401) {
            alert('פג תוקף התחברות. אנא התחבר שוב.');
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`שגיאה בטעינת הצעות: ${response.status} ${response.statusText}`);
        }
        
        const quotes = await response.json();
        
        // Store in global state
        allQuotes = Array.isArray(quotes) ? quotes : [];
        
        // Log statistics
        console.log('=== ALL QUOTES LOADED ===');
        console.log('Loaded count:', allQuotes.length);
        
        // Get unique statuses
        const statuses = [...new Set(allQuotes.map(q => q.status))];
        console.log('Statuses list:', statuses);
        
        // Count pending quotes
        const pendingQuotes = allQuotes.filter(q => PENDING_STATUSES.includes(q.status));
        console.log('Pending count:', pendingQuotes.length);
        console.log('Pending statuses:', PENDING_STATUSES);
        
        // Log count by status
        const statusCounts = {};
        allQuotes.forEach(q => {
            const status = q.status || 'UNKNOWN';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        console.log('Count by status:', statusCounts);
        console.log('=== END ALL QUOTES LOADED ===');
        
    } catch (error) {
        console.error('=== ERROR LOADING ALL QUOTES ===');
        console.error('Error:', error);
        console.error('=== END ERROR ===');
        allQuotes = []; // Reset to empty array on error
        throw error;
    }
}

/**
 * Filter quotes by status and date range
 * Shared function for both pending and history tabs
 */
function filterQuotes(quotes, statusFilter, dateFrom, dateTo) {
    let filtered = [...quotes];
    
    // Filter by status
    if (statusFilter && statusFilter.trim() !== '') {
        filtered = filtered.filter(q => {
            const qStatus = (q.status || '').toUpperCase();
            const filterStatus = statusFilter.toUpperCase();
            return qStatus === filterStatus;
        });
    }
    
    // Filter by date range
    if (dateFrom) {
        filtered = filtered.filter(q => {
            if (!q.eventDate) return false;
            const quoteDate = new Date(q.eventDate);
            const fromDate = new Date(dateFrom);
            return quoteDate >= fromDate;
        });
    }
    
    if (dateTo) {
        filtered = filtered.filter(q => {
            if (!q.eventDate) return false;
            const quoteDate = new Date(q.eventDate);
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999); // End of day
            return quoteDate <= toDate;
        });
    }
    
    return filtered;
}

/**
 * Load pending approvals from allQuotes
 * Filters by PENDING_STATUSES and displays in pending tab
 */
async function loadPendingQuotes() {
    const quotesLoading = document.getElementById('quotesLoading');
    const quotesList = document.getElementById('quotesList');
    const quotesEmpty = document.getElementById('quotesEmpty');
    const quotesError = document.getElementById('quotesError');
    
    console.log('=== LOADING PENDING QUOTES ===');
    console.log('Timestamp:', new Date().toISOString());
    
    // Initialize UI state
    if (quotesEmpty) quotesEmpty.style.display = 'none';
    if (quotesList) quotesList.innerHTML = '';
    if (quotesError) quotesError.style.display = 'none';
    if (quotesLoading) {
        quotesLoading.style.display = 'flex';
        console.log('Loading spinner shown');
    }
    
    try {
        // Reload all quotes if empty (first load or refresh)
        if (allQuotes.length === 0) {
            console.log('allQuotes is empty, reloading...');
            await loadAllQuotes();
        }
        
        // Filter pending quotes
        const pendingQuotes = allQuotes.filter(q => {
            const status = (q.status || '').toUpperCase();
            return PENDING_STATUSES.includes(status);
        });
        
        console.log('=== PENDING QUOTES FILTERED ===');
        console.log('All quotes count:', allQuotes.length);
        console.log('Pending quotes count:', pendingQuotes.length);
        console.log('Pending statuses:', PENDING_STATUSES);
        console.log('=== END PENDING QUOTES FILTERED ===');
        
        // Stop loading spinner
        if (quotesLoading) {
            quotesLoading.style.display = 'none';
        }
        
        // Display results
        if (pendingQuotes.length === 0) {
            console.log('No pending quotes found - showing empty state');
            if (quotesEmpty) {
                quotesEmpty.innerHTML = `
                    <i class="fas fa-inbox"></i>
                    <p>אין בקשות לאישור כרגע</p>
                `;
                quotesEmpty.style.display = 'block';
            }
            if (quotesList) quotesList.innerHTML = '';
        } else {
            console.log('Displaying', pendingQuotes.length, 'pending quotes');
            displayQuotes(pendingQuotes);
            if (quotesEmpty) quotesEmpty.style.display = 'none';
        }
        
    } catch (error) {
        console.error('=== EXCEPTION IN loadPendingQuotes ===');
        console.error('Error:', error);
        console.error('=== END EXCEPTION ===');
        
        // Stop loading spinner
        if (quotesLoading) {
            quotesLoading.style.display = 'none';
        }
        
        // Show error
        if (quotesError) {
            quotesError.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i> <strong>שגיאה:</strong> ${escapeHtml(error.message || 'שגיאה בטעינת בקשות לאישור')}
                <br><small>אנא בדוק את ה-Console (F12) לפרטים נוספים</small>
            `;
            quotesError.style.display = 'block';
        }
        if (quotesList) quotesList.innerHTML = '';
        if (quotesEmpty) quotesEmpty.style.display = 'none';
    }
    
    console.log('=== END LOADING PENDING QUOTES ===');
}

/**
 * Display quotes in the UI as a table
 */
function displayQuotes(quotes) {
    const quotesList = document.getElementById('quotesList');
    
    if (!quotesList) {
        console.error('quotesList element not found');
        return;
    }
    
    console.log('=== DISPLAYING QUOTES ===');
    console.log('Quotes count:', quotes.length);
    
    // Create table HTML
    let tableHTML = `
        <div class="col-12">
            <div class="pending-table-container">
                <table class="pending-table">
                    <thead>
                        <tr>
                            <th>מזהה</th>
                            <th>שם אירוע</th>
                            <th>תאריך</th>
                            <th>מיקום</th>
                            <th>מספר משתתפים</th>
                            <th>עובדים מבוקשים</th>
                            <th>סטטוס</th>
                            <th>פעולות</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    quotes.forEach((quote, index) => {
        // Handle both AdminQuoteResponse and QuoteRequestDTO formats
        const quoteId = quote.id;
        const eventName = quote.eventName || 'ללא שם';
        const status = quote.status || 'UNKNOWN';
        const participantCount = quote.participantCount || 0;
        const location = quote.location || 'לא צוין';
        const eventDate = quote.eventDate || '';
        const requestedWorkers = quote.requestedWorkers || quote.workersNeeded || 0;
        
        // Use mapStatus for consistent Hebrew labels and CSS classes
        const statusInfo = mapStatus(status);
        
        console.log(`Quote ${index + 1}:`, {
            id: quoteId,
            eventName: eventName,
            status: status,
            statusLabel: statusInfo.heLabel,
            participantCount: participantCount
        });
        
        tableHTML += `
            <tr>
                <td>${quoteId}</td>
                <td>${escapeHtml(eventName)}</td>
                <td>${eventDate ? formatDate(eventDate) : 'לא צוין'}</td>
                <td>${escapeHtml(location)}</td>
                <td>${participantCount}</td>
                <td>${requestedWorkers}</td>
                <td>
                    <span class="status-badge ${statusInfo.cssClass}">
                        ${escapeHtml(statusInfo.heLabel)}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="table-btn table-btn-primary" onclick="openApproveModal(${quoteId}, ${JSON.stringify(quote).replace(/"/g, '&quot;')})">
                            <i class="fas fa-check"></i> אישור
                        </button>
                        <button class="table-btn table-btn-danger" onclick="openRejectModal(${quoteId})">
                            <i class="fas fa-times"></i> דחייה
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    quotesList.innerHTML = tableHTML;
    console.log('=== END DISPLAYING QUOTES ===');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Open approve quote modal
 */
function openApproveModal(quoteId, quote) {
    try {
        const quoteObj = typeof quote === 'string' ? JSON.parse(quote.replace(/&quot;/g, '"')) : quote;
        
        document.getElementById('approveQuoteId').value = quoteId;
        document.getElementById('finalPrice').value = quoteObj.quoteAmount || quoteObj.price || '';
        document.getElementById('requestedWorkers').value = quoteObj.workersNeeded || quoteObj.requestedWorkers || 1;
        document.getElementById('adminNotes').value = '';
        
        // Display quote details
        const quoteDetails = document.getElementById('approveQuoteDetails');
        if (quoteDetails) {
            quoteDetails.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <strong>שם האירוע:</strong> ${escapeHtml(quoteObj.eventName || 'ללא שם')}<br>
                        <strong>מספר משתתפים:</strong> ${quoteObj.participantCount || 'לא צוין'}<br>
                        <strong>מיקום:</strong> ${escapeHtml(quoteObj.location || 'לא צוין')}<br>
                        ${quoteObj.clientUserName ? `<strong>לקוח:</strong> ${escapeHtml(quoteObj.clientUserName)}<br>` : ''}
                        ${quoteObj.clientUserEmail ? `<strong>אימייל לקוח:</strong> ${escapeHtml(quoteObj.clientUserEmail)}<br>` : ''}
                    </div>
                    <div class="col-md-6">
                        <strong>תאריך:</strong> ${quoteObj.eventDate ? formatDate(quoteObj.eventDate) : 'לא צוין'}<br>
                        <strong>שעה:</strong> ${formatTime(quoteObj.startTime) || 'לא צוין'}<br>
                        <strong>מחיר ראשוני:</strong> ${quoteObj.quoteAmount ? formatPriceWithCurrency(quoteObj.quoteAmount) : 'לא צוין'}<br>
                        ${quoteObj.productionCompanyName ? `<strong>חברת הפקה:</strong> ${escapeHtml(quoteObj.productionCompanyName)}<br>` : ''}
                    </div>
                </div>
                ${quoteObj.notes ? `
                    <div class="row mt-2">
                        <div class="col-12">
                            <strong>הערות:</strong><br>
                            <div class="border p-2 rounded bg-light">${escapeHtml(quoteObj.notes)}</div>
                        </div>
                    </div>
                ` : ''}
            `;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('approveQuoteModal'));
        modal.show();
    } catch (error) {
        console.error('Error opening approve modal:', error);
        showError('שגיאה בפתיחת טופס אישור: ' + error.message);
    }
}

/**
 * Open reject quote modal
 */
function openRejectModal(quoteId) {
    document.getElementById('rejectQuoteId').value = quoteId;
    document.getElementById('rejectReason').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('rejectQuoteModal'));
    modal.show();
}

/**
 * Handle approve quote
 */
async function handleApproveQuote() {
    const quoteId = document.getElementById('approveQuoteId').value;
    const finalPrice = document.getElementById('finalPrice').value;
    const requestedWorkers = document.getElementById('requestedWorkers').value;
    const adminNotes = document.getElementById('adminNotes').value;
    
    if (!finalPrice || parseFloat(finalPrice) <= 0) {
        showError('אנא הזן מחיר סופי תקין');
        return;
    }
    
    if (!requestedWorkers || parseInt(requestedWorkers) < 0) {
        showError('אנא הזן מספר עובדים תקין');
        return;
    }
    
    try {
        console.log('=== APPROVING QUOTE ===');
        console.log('Quote ID:', quoteId);
        console.log('Final Price:', finalPrice);
        console.log('Requested Workers:', requestedWorkers);
        
        // Get token fresh
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            alert('פג תוקף התחברות. אנא התחבר שוב.');
            window.location.href = '/login.html';
            return;
        }
        
        // Use PUT /admin/quotes/{quoteId}/approve endpoint
        const url = `${window.API_BASE}/admin/quotes/${quoteId}/approve`;
        console.log('URL:', url);
        console.log('Method: PUT');
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                finalPrice: parseFloat(finalPrice),
                requestedWorkers: parseInt(requestedWorkers),
                adminNotes: adminNotes || null
            })
        });
        
        console.log('Response status:', response.status);
        
        if (response.status === 401) {
            alert('פג תוקף התחברות. אנא התחבר שוב.');
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }
        
        if (!response.ok) {
            const errorBody = await response.text().catch(() => 'Unknown error');
            console.error('Error response body:', errorBody);
            throw new Error(`שגיאה ${response.status}: ${errorBody}`);
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('approveQuoteModal'));
        if (modal) modal.hide();
        
        showSuccess('הצעת המחיר אושרה בהצלחה!');
        
        // Reload all quotes and refresh pending tab
        await loadAllQuotes();
        loadPendingQuotes();
    } catch (error) {
        console.error('Error approving quote:', error);
        showError(error.message || 'שגיאה באישור הצעת המחיר');
    }
}

/**
 * Handle reject quote
 */
async function handleRejectQuote() {
    const quoteId = document.getElementById('rejectQuoteId').value;
    const reason = document.getElementById('rejectReason').value;
    
    if (!reason || !reason.trim()) {
        showError('אנא הזן סיבת דחייה');
        return;
    }
    
    try {
        console.log('=== REJECTING QUOTE ===');
        console.log('Quote ID:', quoteId);
        console.log('Reason:', reason);
        
        // Get token fresh
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            alert('פג תוקף התחברות. אנא התחבר שוב.');
            window.location.href = '/login.html';
            return;
        }
        
        // Use PUT /admin/quotes/{id}/reject endpoint
        const url = `${window.API_BASE}/admin/quotes/${quoteId}/reject`;
        console.log('URL:', url);
        console.log('Method: PUT');
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason: reason.trim()
            })
        });
        
        console.log('Response status:', response.status);
        
        if (response.status === 401) {
            alert('פג תוקף התחברות. אנא התחבר שוב.');
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }
        
        if (!response.ok) {
            const errorBody = await response.text().catch(() => 'Unknown error');
            console.error('Error response body:', errorBody);
            throw new Error(`שגיאה ${response.status}: ${errorBody}`);
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('rejectQuoteModal'));
        if (modal) modal.hide();
        
        showSuccess('הצעת המחיר נדחתה בהצלחה!');
        
        // Reload all quotes and refresh pending tab
        await loadAllQuotes();
        loadPendingQuotes();
    } catch (error) {
        console.error('Error rejecting quote:', error);
        showError(error.message || 'שגיאה בדחיית הצעת המחיר');
    }
}

/**
 * Load history quotes with filters
 * Uses allQuotes and applies status/date filters
 */
async function loadHistoryQuotes() {
    const historyLoading = document.getElementById('historyLoading');
    const historyList = document.getElementById('historyList');
    const historyEmpty = document.getElementById('historyEmpty');
    
    try {
        if (historyLoading) historyLoading.style.display = 'flex';
        
        // Reload all quotes if empty (first load or refresh)
        if (allQuotes.length === 0) {
            console.log('allQuotes is empty, reloading...');
            await loadAllQuotes();
        }
        
        // Get filter values
        const statusFilter = document.getElementById('historyStatusFilter')?.value || '';
        const dateFrom = document.getElementById('historyDateFrom')?.value || '';
        const dateTo = document.getElementById('historyDateTo')?.value || '';
        
        console.log('=== FILTERING HISTORY QUOTES ===');
        console.log('All quotes count:', allQuotes.length);
        console.log('Status filter:', statusFilter || 'none');
        console.log('Date from:', dateFrom || 'none');
        console.log('Date to:', dateTo || 'none');
        
        // Apply filters using shared function
        const filteredQuotes = filterQuotes(allQuotes, statusFilter, dateFrom, dateTo);
        
        console.log('Filtered quotes count:', filteredQuotes.length);
        console.log('=== END FILTERING ===');
        
        if (historyLoading) historyLoading.style.display = 'none';
        
        if (!filteredQuotes || filteredQuotes.length === 0) {
            if (historyEmpty) historyEmpty.style.display = 'block';
            if (historyList) historyList.innerHTML = '';
            return;
        }
        
        if (historyEmpty) historyEmpty.style.display = 'none';
        
        if (historyList) {
            historyList.innerHTML = filteredQuotes.map(quote => {
                // Use mapStatus for consistent Hebrew labels and CSS classes
                const statusInfo = mapStatus(quote.status);
                
                return `
                <div class="col-md-6 col-lg-4">
                    <div class="quote-card">
                        <div class="quote-header">
                            <h6 class="quote-title">${escapeHtml(quote.eventName || 'ללא שם')}</h6>
                            <span class="status-badge ${statusInfo.cssClass}">
                                ${escapeHtml(statusInfo.heLabel)}
                            </span>
                        </div>
                        <div class="quote-details">
                            <div class="quote-detail-item">
                                <span class="quote-detail-label">תאריך</span>
                                <span class="quote-detail-value">${formatDate(quote.eventDate)}</span>
                            </div>
                            ${quote.quoteAmount ? `
                                <div class="quote-detail-item">
                                    <span class="quote-detail-label">מחיר</span>
                                    <span class="quote-detail-value">${formatPriceWithCurrency(quote.quoteAmount)}</span>
                                </div>
                            ` : ''}
                        </div>
                        ${quote.approvedAt ? `
                            <div class="mb-2">
                                <small class="text-muted">
                                    <i class="fas fa-calendar-check"></i> אושר ב: ${formatDate(quote.approvedAt)}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading history:', error);
        if (historyLoading) historyLoading.style.display = 'none';
        showError(error.message || 'שגיאה בטעינת היסטוריה');
    }
}

/**
 * Load events
 */
async function loadEvents() {
    const eventsLoading = document.getElementById('eventsLoading');
    const eventsList = document.getElementById('eventsList');
    const eventsEmpty = document.getElementById('eventsEmpty');
    
    try {
        if (eventsLoading) eventsLoading.style.display = 'flex';
        
        // Get token fresh
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            alert('פג תוקף התחברות. אנא התחבר שוב.');
            window.location.href = '/login.html';
            return;
        }
        
        // For admin, use /events endpoint (not /events/my which requires ADMIN role)
        // Since manager-dashboard is for admin, we can use /events which returns all events for authenticated user
        const url = `${window.API_BASE}/events`;
        console.log('Loading events from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            alert('פג תוקף התחברות. אנא התחבר שוב.');
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error('שגיאה בטעינת אירועים');
        }
        
        const events = await response.json();
        
        if (eventsLoading) eventsLoading.style.display = 'none';
        
        if (!events || events.length === 0) {
            if (eventsEmpty) eventsEmpty.style.display = 'block';
            if (eventsList) eventsList.innerHTML = '';
            return;
        }
        
        if (eventsEmpty) eventsEmpty.style.display = 'none';
        
        if (eventsList) {
            eventsList.innerHTML = events.map(event => `
                <div class="col-md-6 col-lg-4">
                    <div class="quote-card">
                        <h6 class="quote-title">${escapeHtml(event.name || 'ללא שם')}</h6>
                        <div class="quote-details">
                            <div class="quote-detail-item">
                                <span class="quote-detail-label">תאריך</span>
                                <span class="quote-detail-value">${formatDate(event.eventDate)}</span>
                            </div>
                            <div class="quote-detail-item">
                                <span class="quote-detail-label">מיקום</span>
                                <span class="quote-detail-value">${escapeHtml(event.location || 'לא צוין')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading events:', error);
        if (eventsLoading) eventsLoading.style.display = 'none';
        showError(error.message || 'שגיאה בטעינת אירועים');
    }
}

/**
 * Load workers
 */
async function loadWorkers() {
    const workersLoading = document.getElementById('workersLoading');
    const workersList = document.getElementById('workersList');
    const workersEmpty = document.getElementById('workersEmpty');
    
    try {
        if (workersLoading) workersLoading.style.display = 'flex';
        
        // TODO: Implement workers endpoint
        // For now, show empty state
        if (workersLoading) workersLoading.style.display = 'none';
        
        if (workersEmpty) workersEmpty.style.display = 'block';
        if (workersList) workersList.innerHTML = '';
    } catch (error) {
        console.error('Error loading workers:', error);
        if (workersLoading) workersLoading.style.display = 'none';
        showError(error.message || 'שגיאה בטעינת עובדים');
    }
}
