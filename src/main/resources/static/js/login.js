/*********************************
 * CONFIG
 * Note: API_BASE is loaded from config.js
 *********************************/
// API_BASE is defined in config.js (loaded before this file)
const AUTH_URL = `${API_BASE}/auth`;

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
    },
    'EMPLOYEE': {
        text: 'עובד',
        icon: 'fa-user-tie',
        subtitle: 'התחבר כעובד',
        color: '#34a853'
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
function goBackToSelection() {
    window.location.href = '/select-role.html';
}

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
            // Clear selected role from session
            const selectedRole = sessionStorage.getItem('selectedRole');
            sessionStorage.removeItem('selectedRole');
            
            // Redirect based on role
            if (selectedRole === 'CLIENT') {
                window.location.href = "/client-dashboard.html";
            } else {
                window.location.href = "/dashboard.html";
            }
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

        alert("ההרשמה הצליחה! אנא התחבר.");
        
        if (window.bootstrap) {
            const modalEl = document.getElementById("signUpModal");
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal?.hide();
        }
        
        e.target.reset();
    } catch (err) {
        alert("שגיאה: " + err.message);
        console.error(err);
    }
}

/*********************************
 * GOOGLE LOGIN
 *********************************/
function handleGoogleLogin() {
    // Placeholder for Google OAuth integration
    alert("התחברות עם Google תושק בקרוב");
}

/*********************************
 * SHOW SIGN UP
 *********************************/
function showSignUp() {
    if (window.bootstrap) {
        const modalEl = document.getElementById("signUpModal");
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

