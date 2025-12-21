const API_BASE = window.API_BASE || 'http://localhost:8080';
const PROFILE_URL = `${API_BASE}/worker/profile`;

let authToken = null;

document.addEventListener('DOMContentLoaded', function() {
    authToken = localStorage.getItem('token');
    if (!authToken) {
        alert('אנא התחבר תחילה');
        window.location.href = '/login.html';
        return;
    }

    loadProfile();
    
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
});

async function loadProfile() {
    try {
        const response = await fetch(PROFILE_URL, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('שגיאה בטעינת הפרופיל');
        }

        const profile = await response.json();
        
        // Populate form
        document.getElementById('phone').value = profile.phone || '';
        document.getElementById('city').value = profile.city || '';
        document.getElementById('skills').value = profile.skills || '';
        document.getElementById('homeLat').value = profile.homeLat || '';
        document.getElementById('homeLng').value = profile.homeLng || '';
        
    } catch (error) {
        console.error('Error loading profile:', error);
        // Profile might not exist yet, that's OK
    }
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const phone = document.getElementById('phone').value;
    const city = document.getElementById('city').value;
    const skills = document.getElementById('skills').value;
    const homeLat = document.getElementById('homeLat').value;
    const homeLng = document.getElementById('homeLng').value;
    
    const profileData = {
        phone: phone || null,
        city: city || null,
        skills: skills || null,
        homeLat: homeLat ? parseFloat(homeLat) : null,
        homeLng: homeLng ? parseFloat(homeLng) : null
    };
    
    try {
        const response = await fetch(PROFILE_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'שגיאה בשמירת הפרופיל');
        }

        alert('הפרופיל נשמר בהצלחה!');
        
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('שגיאה: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

