/*********************************
 * COMMON JAVASCRIPT FUNCTIONS
 * Shared utilities for all pages
 *********************************/

// API_BASE is defined in config.js as window.API_BASE
// Use window.API_BASE directly - DO NOT redeclare

/**
 * Get authentication token from localStorage
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!getToken();
}

// logout function will be defined at the end of this file

/**
 * Make authenticated API request with error handling
 */
async function apiRequest(url, options = {}) {
    const token = getToken();
    
    if (!token) {
        console.warn('No token found, redirecting to login');
        window.location.href = '/login.html';
        return null;
    }
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };
    
    try {
        const response = await fetch(`${window.API_BASE}${url}`, mergedOptions);
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            console.warn('Token expired or invalid, redirecting to login');
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return null;
        }
        
        // Handle 403 Forbidden
        if (response.status === 403) {
            throw new Error('אין לך הרשאה לגשת למשאב זה');
        }
        
        // Handle 404 Not Found
        if (response.status === 404) {
            throw new Error('המשאב המבוקש לא נמצא');
        }
        
        // Handle 500 Internal Server Error
        if (response.status >= 500) {
            throw new Error('שגיאת שרת. אנא נסה שוב מאוחר יותר');
        }
        
        return response;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

/**
 * Format date to Hebrew locale
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format time to HH:MM
 */
function formatTime(timeString) {
    if (!timeString) return '';
    if (typeof timeString === 'string' && timeString.includes(':')) {
        return timeString.substring(0, 5);
    }
    return timeString;
}

/**
 * Format price to Hebrew locale with currency
 */
function formatPrice(price) {
    if (!price && price !== 0) return '0';
    return parseFloat(price).toLocaleString('he-IL');
}

/**
 * Format price with currency symbol
 */
function formatPriceWithCurrency(price) {
    return `${formatPrice(price)} ₪`;
}

/**
 * Map status to Hebrew label and CSS class
 * Supports both QUOTE_PENDING and SENT_TO_MANAGER for pending status
 */
function mapStatus(status) {
    const statusUpper = (status || '').toUpperCase();
    
    // Pending statuses (yellow)
    if (statusUpper === 'QUOTE_PENDING' || statusUpper === 'SENT_TO_MANAGER' || statusUpper === 'MANAGER_REVIEW') {
        return {
            heLabel: 'ממתין לאישור',
            cssClass: 'status-pending'
        };
    }
    
    // Approved (green)
    if (statusUpper === 'APPROVED' || statusUpper === 'QUOTE_APPROVED') {
        return {
            heLabel: 'אושר',
            cssClass: 'status-approved'
        };
    }
    
    // Rejected (red)
    if (statusUpper === 'REJECTED' || statusUpper === 'QUOTE_REJECTED') {
        return {
            heLabel: 'נדחה',
            cssClass: 'status-rejected'
        };
    }
    
    // Quote Pending (waiting for manager approval)
    if (statusUpper === 'QUOTE_PENDING') {
        return {
            heLabel: 'ממתין לאישור מנהל',
            cssClass: 'status-pending'
        };
    }
    
    // Draft (gray)
    if (statusUpper === 'DRAFT') {
        return {
            heLabel: 'טיוטה',
            cssClass: 'status-default'
        };
    }
    
    // Completed
    if (statusUpper === 'COMPLETED') {
        return {
            heLabel: 'הושלם',
            cssClass: 'status-default'
        };
    }
    
    // Cancelled
    if (statusUpper === 'CANCELLED') {
        return {
            heLabel: 'בוטל',
            cssClass: 'status-default'
        };
    }
    
    // Default
    return {
        heLabel: status || 'לא ידוע',
        cssClass: 'status-default'
    };
}

/**
 * Get status text in Hebrew
 */
function getStatusText(status) {
    return mapStatus(status).heLabel;
}

/**
 * Get status badge class
 */
function getStatusBadgeClass(status) {
    return mapStatus(status).cssClass;
}

/**
 * Show error message to user
 */
function showError(message) {
    alert(`שגיאה: ${message}`);
}

/**
 * Show success message to user
 */
function showSuccess(message) {
    alert(`הצלחה: ${message}`);
}

/**
 * Show loading spinner
 */
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'flex';
        console.log('showLoading:', elementId, 'display set to flex');
    } else {
        console.warn('showLoading: element not found:', elementId);
    }
}

/**
 * Hide loading spinner
 */
function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
        console.log('hideLoading:', elementId, 'display set to none');
    } else {
        console.warn('hideLoading: element not found:', elementId);
    }
}

/**
 * Check authentication on page load
 */
function checkAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
    }
}

/**
 * Logout function - clears token and redirects to login
 * This is a simplified version for direct onclick usage
 */
function logout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    window.location.href = "/login.html";
}

// Make logout available globally - IMPORTANT!
window.logout = logout;
