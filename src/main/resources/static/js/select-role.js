/*********************************
 * ROLE SELECTION
 *********************************/
let selectedRole = null;

function selectRole(role) {
    // Remove previous selection
    document.querySelectorAll('.role-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection to clicked card
    event.currentTarget.classList.add('selected');
    selectedRole = role;
    
    // Show continue button
    const continueBtn = document.getElementById('continueBtn');
    if (continueBtn) {
        continueBtn.style.display = 'flex';
    }
}

function continueToLogin() {
    if (!selectedRole) {
        alert('אנא בחר סוג משתמש');
        return;
    }
    
    // Store selected role in sessionStorage
    sessionStorage.setItem('selectedRole', selectedRole);
    
    // Redirect to login page with role parameter
    window.location.href = `/login.html?role=${selectedRole}`;
}

// Check if role is already selected (for back navigation)
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');
    
    if (role) {
        // Pre-select role if coming from back button
        const roleMap = {
            'ADMIN': 0,
            'CLIENT': 1,
            'EMPLOYEE': 2
        };
        const cards = document.querySelectorAll('.role-card');
        if (roleMap[role] !== undefined && cards[roleMap[role]]) {
            cards[roleMap[role]].click();
        }
    }
});

