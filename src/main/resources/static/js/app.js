/*********************************
 * CONFIG
 * Note: API_BASE is loaded from config.js
 *********************************/
// API_BASE is defined in config.js (loaded before this file)
const AUTH_URL = `${API_BASE}/auth`;

/*********************************
 * INIT (DOM READY)
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
    initAuthForms();
    initPublicForms();
});

/*********************************
 * AUTH FORMS
 *********************************/
function initAuthForms() {
    const registerForm = document.getElementById("registerForm");
    const loginForm = document.getElementById("loginForm");

    if (registerForm) {
        registerForm.addEventListener("submit", handleRegister);
    }
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    const payload = {
        name: name,
        email: email,
        password: password
    };

    try {
        const res = await fetch(`${AUTH_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || "Registration failed");
        }

        const data = await res.json();
        alert("Registration successful! Please login.");
        
        // Close register modal and open login modal
        const registerModalEl = document.getElementById("registerModal");
        const loginModalEl = document.getElementById("loginModal");
        if (window.bootstrap) {
            const registerModal = bootstrap.Modal.getInstance(registerModalEl);
            const loginModal = bootstrap.Modal.getInstance(loginModalEl) || new bootstrap.Modal(loginModalEl);
            registerModal?.hide();
            setTimeout(() => loginModal?.show(), 300);
        }
        
        e.target.reset();
    } catch (err) {
        alert("Error: " + err.message);
        console.error(err);
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    const payload = {
        email: email,
        password: password
    };

    try {
        const res = await fetch(`${AUTH_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error("Invalid email or password");
        }

        const data = await res.json();
        
        // Store token
        if (data.token) {
            localStorage.setItem("token", data.token);
            alert("Login successful! Redirecting to dashboard...");
            // Redirect to dashboard
            window.location.href = "/dashboard.html";
        } else {
            throw new Error("No token received");
        }
    } catch (err) {
        alert("Error: " + err.message);
        console.error(err);
    }
}

/*********************************
 * PUBLIC FORMS
 *********************************/
function initPublicForms() {
    const reachUsForm = document.getElementById("reachUsForm");
    const reviewForm = document.getElementById("reviewForm");

    if (reachUsForm) {
        reachUsForm.addEventListener("submit", handleReachUs);
    }
    if (reviewForm) {
        reviewForm.addEventListener("submit", handleReview);
    }
}

async function handleReachUs(e) {
    e.preventDefault();

    const name = document.getElementById("guestName").value;
    const email = document.getElementById("guestEmail").value;
    const phone = document.getElementById("guestPhone").value;
    const eventName = document.getElementById("reachEventName").value;
    const eventDate = document.getElementById("reachEventDate").value;
    const description = document.getElementById("reachDescription").value;

    // For now, just show success message
    // You can add API endpoint later if needed
    alert("Thank you for your inquiry! We'll get back to you soon.");
    
    if (window.bootstrap) {
        const modalEl = document.getElementById("reachUsModal");
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal?.hide();
    }
    
    e.target.reset();
}

async function handleReview(e) {
    e.preventDefault();

    const reviewerName = document.getElementById("reviewerName").value;
    const reviewText = document.getElementById("reviewText").value;

    // For now, just show success message
    // You can add API endpoint later if needed
    alert("Thank you for your review!");
    
    if (window.bootstrap) {
        const modalEl = document.getElementById("reviewModal");
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal?.hide();
    }
    
    e.target.reset();
}

