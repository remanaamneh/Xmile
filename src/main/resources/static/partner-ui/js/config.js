/*********************************
 * API CONFIGURATION for Partner UI
 * This file centralizes the API base URL configuration
 *********************************/

// Try to get API base URL from meta tag first (for production)
function getApiBaseUrl() {
    // Check if there's a meta tag with the API URL
    const metaTag = document.querySelector('meta[name="api-base-url"]');
    if (metaTag && metaTag.content) {
        return metaTag.content;
    }
    
    // Check if there's a global variable set
    if (window.API_BASE_URL) {
        return window.API_BASE_URL;
    }
    
    // Auto-detect based on current location (for production)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        // Production: use the same origin as the frontend
        return window.location.origin;
    }
    
    // Default: use relative URLs (works with any domain)
    return '';
}

// Export the API base URL
const API_BASE = getApiBaseUrl();

// Log the API base URL for debugging
console.log('API Base URL:', API_BASE);

