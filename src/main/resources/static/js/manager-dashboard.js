/*********************************
 * MANAGER DASHBOARD
 * Handles manager/admin quote approval and management
 * Version: 1.0.4
 *********************************/

console.log('=== MANAGER DASHBOARD JS LOADED ===');
console.log('Version: 1.0.4');
console.log('Timestamp:', new Date().toISOString());

// API_BASE is defined in config.js as window.API_BASE
// Use window.API_BASE directly - DO NOT redeclare
console.log('API_BASE (manager-dashboard):', window.API_BASE);

let authToken = null;

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
    
    // Load pending quotes by default
    loadPendingQuotes();
    
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
    
    // Logout button uses onclick="window.logout()" directly in HTML
    // No need for event listener here
    
    console.log('=== END MANAGER DASHBOARD INIT ===');
});

/**
 * Load pending approvals from server
 * DETERMINISTIC: Always stops loading spinner, always shows result or error
 * This function is also aliased as loadPendingQuotes for backward compatibility
 */
async function loadPendingApprovals() {
    console.log('loadPendingApprovals() called - delegating to loadPendingQuotes()');
    return loadPendingQuotes();
}

/**
 * Load pending quotes from server
 * DETERMINISTIC: Always stops loading spinner, always shows result or error
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
    
    let response = null;
    let quotes = null;
    let errorOccurred = false;
    let errorMessage = '';
    let responseBody = '';
    
    try {
        // Get token fresh from storage (check both localStorage and sessionStorage)
        authToken = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!authToken) {
            console.error('No token found in storage');
            errorOccurred = true;
            errorMessage = 'פג תוקף התחברות. אנא התחבר שוב.';
            alert(errorMessage);
            window.location.href = '/login.html';
            return;
        }
        
        console.log('Token found, length:', authToken.length);
        
        // Try endpoint 1: GET /admin/quotes/pending
        const url1 = `${window.API_BASE}/admin/quotes/pending`;
        console.log('=== ATTEMPT 1: GET /admin/quotes/pending ===');
        console.log('Full URL:', url1);
        console.log('Method: GET');
        console.log('Headers:', {
            'Authorization': 'Bearer ***' + authToken.substring(authToken.length - 4),
            'Content-Type': 'application/json'
        });
        
        try {
            response = await fetch(url1, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Response received');
            console.log('Status:', response.status);
            console.log('Status Text:', response.statusText);
            console.log('OK:', response.ok);
            console.log('Response URL:', response.url);
            
            if (response.ok) {
                responseBody = await response.text();
                console.log('Response body (raw):', responseBody);
                try {
                    quotes = JSON.parse(responseBody);
                    console.log('Response body (parsed):', quotes);
                    console.log('Quotes type:', typeof quotes);
                    console.log('Quotes is array:', Array.isArray(quotes));
                    console.log('Quotes count:', Array.isArray(quotes) ? quotes.length : 'N/A');
                } catch (parseError) {
                    console.error('Failed to parse JSON:', parseError);
                    console.error('Response text:', responseBody);
                    throw new Error('תשובה לא תקינה מהשרת (לא JSON)');
                }
            } else if (response.status === 404) {
                // If 404, try fallback endpoint
                console.log('Endpoint 1 returned 404, trying fallback endpoint...');
                throw new Error('404 - trying fallback');
            } else {
                // For other errors, read response body
                responseBody = await response.text().catch(() => 'Unknown error');
                console.error('Endpoint 1 failed with status:', response.status);
                console.error('Response body:', responseBody);
                throw new Error(`Endpoint 1 returned ${response.status}`);
            }
        } catch (endpoint1Error) {
            console.warn('Endpoint 1 failed:', endpoint1Error.message);
            
            // Try endpoint 2: GET /admin/quotes?status=QUOTE_PENDING (fallback)
            const url2 = `${window.API_BASE}/admin/quotes?status=QUOTE_PENDING`;
            console.log('=== ATTEMPT 2: GET /admin/quotes?status=QUOTE_PENDING ===');
            console.log('Full URL:', url2);
            console.log('Method: GET');
            console.log('Headers:', {
                'Authorization': 'Bearer ***' + authToken.substring(authToken.length - 4),
                'Content-Type': 'application/json'
            });
            
            try {
                response = await fetch(url2, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('Response received (attempt 2)');
                console.log('Status:', response.status);
                console.log('Status Text:', response.statusText);
                console.log('OK:', response.ok);
                console.log('Response URL:', response.url);
                
                if (response.ok) {
                    responseBody = await response.text();
                    console.log('Response body (raw):', responseBody);
                    try {
                        quotes = JSON.parse(responseBody);
                        console.log('Response body (parsed):', quotes);
                        console.log('Quotes type:', typeof quotes);
                        console.log('Quotes is array:', Array.isArray(quotes));
                        console.log('Quotes count:', Array.isArray(quotes) ? quotes.length : 'N/A');
                    } catch (parseError) {
                        console.error('Failed to parse JSON:', parseError);
                        console.error('Response text:', responseBody);
                        throw new Error('תשובה לא תקינה מהשרת (לא JSON)');
                    }
                } else {
                    responseBody = await response.text().catch(() => 'Unknown error');
                    console.error('Endpoint 2 also failed with status:', response.status);
                    console.error('Response body:', responseBody);
                }
            } catch (endpoint2Error) {
                console.error('Endpoint 2 also failed:', endpoint2Error.message);
                // Try one more fallback: /admin/quote-requests?status=MANAGER_REVIEW
                const url3 = `${window.API_BASE}/admin/quote-requests?status=MANAGER_REVIEW`;
                console.log('=== ATTEMPT 3: GET /admin/quote-requests?status=MANAGER_REVIEW ===');
                console.log('Full URL:', url3);
                
                response = await fetch(url3, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('Response received (attempt 3)');
                console.log('Status:', response.status);
                console.log('OK:', response.ok);
                
                if (response.ok) {
                    responseBody = await response.text();
                    quotes = JSON.parse(responseBody);
                    console.log('Quotes count (attempt 3):', Array.isArray(quotes) ? quotes.length : 'N/A');
                } else {
                    responseBody = await response.text().catch(() => 'Unknown error');
                }
            }
        }
        
        // Handle HTTP status codes
        if (response && response.status === 401) {
            console.error('401 Unauthorized - Token expired or invalid');
            errorOccurred = true;
            errorMessage = 'פג תוקף התחברות. אנא התחבר שוב.';
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            alert(errorMessage);
            window.location.href = '/login.html';
            return;
        }
        
        if (response && response.status === 403) {
            console.error('403 Forbidden - No permission');
            errorOccurred = true;
            errorMessage = 'אין לך הרשאה לגשת לבקשות לאישור';
            if (responseBody) {
                errorMessage += `\nפרטים: ${responseBody}`;
            }
        }
        
        if (response && response.status === 404) {
            console.error('404 Not Found - Endpoint does not exist');
            errorOccurred = true;
            const attemptedUrl = response.url || 'unknown';
            errorMessage = `הנתיב לא קיים: ${attemptedUrl}`;
            if (responseBody) {
                errorMessage += `\nפרטים: ${responseBody}`;
            }
        }
        
        if (response && response.status >= 500) {
            console.error('Server error:', response.status);
            errorOccurred = true;
            errorMessage = `שגיאת שרת (${response.status}): ${response.statusText}`;
            if (responseBody) {
                errorMessage += `\nפרטים: ${responseBody}`;
            }
        }
        
        if (response && !response.ok && !errorOccurred) {
            console.error('Response not OK:', response.status);
            errorOccurred = true;
            errorMessage = `שגיאה בטעינת נתונים: ${response.status} ${response.statusText}`;
            if (responseBody) {
                errorMessage += `\nפרטים: ${responseBody}`;
            }
        }
        
    } catch (error) {
        console.error('=== EXCEPTION IN loadPendingQuotes ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('=== END EXCEPTION ===');
        
        errorOccurred = true;
        errorMessage = `שגיאה: ${error.message}`;
        if (responseBody) {
            errorMessage += `\nפרטים: ${responseBody}`;
        }
    } finally {
        // ALWAYS stop loading spinner
        console.log('=== FINALLY: Stopping loading spinner ===');
        if (quotesLoading) {
            quotesLoading.style.display = 'none';
            console.log('Loading spinner hidden');
        }
        
        // Display result or error
        if (errorOccurred) {
            console.log('Displaying error message');
            if (quotesError) {
                quotesError.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i> <strong>שגיאה:</strong> ${escapeHtml(errorMessage)}
                    <br><small>אנא בדוק את ה-Console (F12) לפרטים נוספים</small>
                `;
                quotesError.style.display = 'block';
            }
            if (quotesList) quotesList.innerHTML = '';
            if (quotesEmpty) quotesEmpty.style.display = 'none';
        } else if (quotes && Array.isArray(quotes)) {
            if (quotesError) quotesError.style.display = 'none';
            if (quotes.length === 0) {
                console.log('No quotes found - showing empty state');
                if (quotesEmpty) {
                    quotesEmpty.innerHTML = `
                        <i class="fas fa-inbox"></i>
                        <p>אין בקשות לאישור כרגע</p>
                    `;
                    quotesEmpty.style.display = 'block';
                }
                if (quotesList) quotesList.innerHTML = '';
            } else {
                console.log('Displaying', quotes.length, 'quotes');
                displayQuotes(quotes);
                if (quotesEmpty) quotesEmpty.style.display = 'none';
            }
        } else {
            console.error('Invalid quotes data:', quotes);
            if (quotesError) {
                quotesError.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i> שגיאה: תשובה לא תקינה מהשרת (צפוי מערך)
                    <br><small>סוג נתונים: ${typeof quotes}</small>
                `;
                quotesError.style.display = 'block';
            }
            if (quotesList) quotesList.innerHTML = '';
            if (quotesEmpty) quotesEmpty.style.display = 'none';
        }
        
        console.log('=== END LOADING PENDING QUOTES ===');
    }
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
        
        console.log(`Quote ${index + 1}:`, {
            id: quoteId,
            eventName: eventName,
            status: status,
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
                    <span class="status-badge ${getStatusBadgeClass(status)}">
                        ${getStatusText(status)}
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
        console.log('Headers:', {
            'Authorization': 'Bearer ***' + token.substring(token.length - 4),
            'Content-Type': 'application/json'
        });
        
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
        loadPendingQuotes();
    } catch (error) {
        console.error('Error rejecting quote:', error);
        showError(error.message || 'שגיאה בדחיית הצעת המחיר');
    }
}

/**
 * Load history quotes with filters
 */
async function loadHistoryQuotes() {
    const historyLoading = document.getElementById('historyLoading');
    const historyList = document.getElementById('historyList');
    const historyEmpty = document.getElementById('historyEmpty');
    
    try {
        if (historyLoading) historyLoading.style.display = 'flex';
        
        const statusFilter = document.getElementById('historyStatusFilter')?.value || '';
        const dateFrom = document.getElementById('historyDateFrom')?.value || '';
        const dateTo = document.getElementById('historyDateTo')?.value || '';
        
        // Get token fresh
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            alert('פג תוקף התחברות. אנא התחבר שוב.');
            window.location.href = '/login.html';
            return;
        }
        
        // Build query params
        const params = new URLSearchParams();
        if (statusFilter) params.append('status', statusFilter);
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);
        
        const queryString = params.toString();
        const url = `${window.API_BASE}/admin/quote-requests${queryString ? '?' + queryString : ''}`;
        console.log('Loading history from:', url);
        
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
            throw new Error('שגיאה בטעינת היסטוריה');
        }
        
        const quotes = await response.json();
        
        if (historyLoading) historyLoading.style.display = 'none';
        
        if (!quotes || quotes.length === 0) {
            if (historyEmpty) historyEmpty.style.display = 'block';
            if (historyList) historyList.innerHTML = '';
            return;
        }
        
        if (historyEmpty) historyEmpty.style.display = 'none';
        
        if (historyList) {
            historyList.innerHTML = quotes.map(quote => `
                <div class="col-md-6 col-lg-4">
                    <div class="quote-card">
                        <div class="quote-header">
                            <h6 class="quote-title">${escapeHtml(quote.eventName || 'ללא שם')}</h6>
                            <span class="status-badge ${getStatusBadgeClass(quote.status)}">
                                ${getStatusText(quote.status)}
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
            `).join('');
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
        
        const url = `${window.API_BASE}/events/my`;
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
