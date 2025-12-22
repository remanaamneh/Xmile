/*********************************
 * CONFIG
 * Note: API_BASE is loaded from config.js
 *********************************/
// API_BASE is defined in config.js (loaded before this file) as window.API_BASE
const AUTH_URL = `${window.API_BASE}/auth`;

/*********************************
 * ROLE CONFIG
 *********************************/
const roleConfig = {
    'ADMIN': {
        text: 'מנהל מערכת',
        icon: 'fa-user-shield',
        subtitle: 'התחבר כמנהל מערכת',
        color: '#ea4335'
    },
    'CLIENT': {
        text: 'לקוח עסקי',
        icon: 'fa-building',
        subtitle: 'התחבר כלקוח עסקי',
        color: '#4285f4'
    }
};

/*********************************
 * INIT (DOM READY)
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
    // Check if role is selected
    const urlParams = new URLSearchParams(window.location.search);
    let role = urlParams.get('role') || sessionStorage.getItem('selectedRole');
    
    if (!role) {
        // Redirect to role selection if no role selected
        window.location.href = '/select-role.html';
        return;
    }
    
    // Display selected role
    displayRole(role);
    
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
    if (registerForm) {
        registerForm.addEventListener("submit", handleRegister);
    }
});

/*********************************
 * DISPLAY ROLE
 *********************************/
function displayRole(role) {
    const config = roleConfig[role];
    if (!config) return;
    
    const subtitleEl = document.getElementById('roleSubtitle');
    const badgeEl = document.getElementById('roleBadge');
    const roleTextEl = document.getElementById('roleText');
    const roleIconEl = document.getElementById('roleIcon');
    
    if (subtitleEl) {
        subtitleEl.textContent = config.subtitle;
    }
    
    if (badgeEl && roleTextEl && roleIconEl) {
        badgeEl.style.display = 'flex';
        roleTextEl.textContent = config.text;
        roleIconEl.className = `fas ${config.icon}`;
        badgeEl.style.background = `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`;
    }
}

/*********************************
 * GO BACK TO SELECTION
 *********************************/
window.goBackToSelection = function() {
    window.location.href = '/select-role.html';
};

/*********************************
 * LOGIN
 *********************************/
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
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
            throw new Error("אימייל או סיסמה לא נכונים");
        }

        const data = await res.json();
        
        if (data.token) {
            localStorage.setItem("token", data.token);
            
            // Get user role from API response (this is the source of truth)
            const userRole = data.role;
            
            // Clear selected role from session as we use the actual role from API
            sessionStorage.removeItem('selectedRole');
            
            console.log("=== LOGIN SUCCESS ===");
            console.log("User role from API:", userRole);
            
            // Redirect based on role from API response
            let redirectUrl = null;
            
            if (userRole === 'ADMIN') {
                redirectUrl = "/manager-dashboard.html";
            } else if (userRole === 'CLIENT') {
                redirectUrl = "/client-dashboard.html";
            } else {
                console.warn("Unknown role, redirecting to role selection");
                redirectUrl = "/select-role.html";
            }
            
            console.log("Redirecting to:", redirectUrl);
            console.log("=== END LOGIN SUCCESS ===");
            
            window.location.href = redirectUrl;
        } else {
            throw new Error("לא התקבל טוקן");
        }
    } catch (err) {
        alert("שגיאה: " + err.message);
        console.error(err);
    }
}

/*********************************
 * REGISTER
 *********************************/
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

    console.log("Register payload:", payload);

    try {
        const res = await fetch(`${AUTH_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorText = await res.text().catch(() => 'Registration failed');
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: errorText };
            }
            throw new Error(errorData.message || errorData.error || "Registration failed");
        }

        const data = await res.json();
        console.log("Registration successful, role:", data.role);

        alert("ההרשמה הצליחה! אנא התחבר.");
        
        if (window.bootstrap) {
            const modalEl = document.getElementById("signUpModal");
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal?.hide();
        }
        
        e.target.reset();
    } catch (err) {
        alert("שגיאה: " + err.message);
        console.error("Registration error:", err);
    }
}


/*********************************
 * SHOW SIGN UP
 *********************************/
window.showSignUp = function() {
    if (window.bootstrap) {
        const modalEl = document.getElementById("signUpModal");
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
};

/*********************************
 * GOOGLE LOGIN (window function)
 *********************************/
window.handleGoogleLogin = function() {
    // Placeholder for Google OAuth integration
    alert("התחברות עם Google תושק בקרוב");
};

