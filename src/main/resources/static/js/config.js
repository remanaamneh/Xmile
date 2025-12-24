/*********************************
 * API CONFIGURATION
 * This file centralizes the API base URL configuration
 * For production, set the API_BASE_URL in your HTML or use environment detection
 *********************************/

// config.js - Define API_BASE ONLY HERE
// API_BASE should be the full base URL (e.g., "https://xmilecompany.com")
// For relative URLs (recommended), use empty string "" - works with any domain
// For relative URLs (same domain), use empty string ""
// All API paths should start with "/" (e.g., "/client/campaigns")
// Using relative URLs by default - works with any domain
window.API_BASE = window.API_BASE || "";
window.UNSPLASH_KEY = "QfelHjyT3RcwFWibGUVgCTqqle2ScjdlyUaBe2qcBcE";
console.log("API Base URL (config.js):", window.API_BASE || "(relative - using current domain)");
