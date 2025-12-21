const API_BASE = window.API_BASE || 'http://localhost:8080';
const OFFERS_URL = `${API_BASE}/worker/offers`;

let authToken = null;
let allOffers = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    authToken = localStorage.getItem('token');
    if (!authToken) {
        alert('אנא התחבר תחילה');
        window.location.href = '/login.html';
        return;
    }

    loadOffers();
});

async function loadOffers() {
    try {
        const response = await fetch(OFFERS_URL, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('שגיאה בטעינת הצעות עבודה');
        }

        allOffers = await response.json();
        renderOffers();
        
    } catch (error) {
        console.error('Error loading offers:', error);
        document.getElementById('offersList').innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <p class="text-danger">שגיאה בטעינת הצעות עבודה</p>
                <small class="text-muted">${error.message}</small>
            </div>
        `;
    }
}

function filterOffers(filter) {
    currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderOffers();
}

function renderOffers() {
    const offersList = document.getElementById('offersList');
    
    let filteredOffers = allOffers;
    if (currentFilter !== 'all') {
        filteredOffers = allOffers.filter(offer => offer.status === currentFilter);
    }
    
    if (filteredOffers.length === 0) {
        offersList.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-briefcase fa-3x text-muted mb-3"></i>
                <p class="text-muted">לא נמצאו הצעות עבודה</p>
            </div>
        `;
        return;
    }
    
    offersList.innerHTML = filteredOffers.map(offer => `
        <div class="col-md-6 col-lg-4">
            <div class="offer-card">
                <div class="offer-header">
                    <h5 class="offer-title">${offer.eventName || 'ללא שם'}</h5>
                    <span class="offer-status status-${offer.status}">
                        ${getStatusText(offer.status)}
                    </span>
                </div>
                <div class="offer-details">
                    ${offer.eventDate ? `
                        <div class="offer-detail">
                            <i class="fas fa-calendar"></i>
                            <span>${formatDate(offer.eventDate)}</span>
                        </div>
                    ` : ''}
                    ${offer.startTime ? `
                        <div class="offer-detail">
                            <i class="fas fa-clock"></i>
                            <span>${formatTime(offer.startTime)}</span>
                        </div>
                    ` : ''}
                    ${offer.location ? `
                        <div class="offer-detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${offer.location}</span>
                        </div>
                    ` : ''}
                    ${offer.participantCount ? `
                        <div class="offer-detail">
                            <i class="fas fa-users"></i>
                            <span>${offer.participantCount} משתתפים</span>
                        </div>
                    ` : ''}
                    ${offer.distanceKm ? `
                        <div class="offer-detail">
                            <i class="fas fa-route"></i>
                            <span>${offer.distanceKm.toFixed(1)} ק"מ</span>
                        </div>
                    ` : ''}
                </div>
                ${offer.payAmount ? `
                    <div class="offer-price">
                        <i class="fas fa-shekel-sign"></i> ${formatPrice(offer.payAmount)}
                    </div>
                ` : ''}
                ${offer.status === 'PENDING' ? `
                    <div class="offer-actions">
                        <button class="btn btn-accept btn-sm flex-fill" onclick="acceptOffer(${offer.id})">
                            <i class="fas fa-check"></i> מקבל
                        </button>
                        <button class="btn btn-decline btn-sm flex-fill" onclick="declineOffer(${offer.id})">
                            <i class="fas fa-times"></i> דוחה
                        </button>
                    </div>
                ` : `
                    <div class="text-center mt-3">
                        <small class="text-muted">
                            ${offer.status === 'ACCEPTED' ? 
                                '<i class="fas fa-check-circle text-success"></i> אושר' : 
                                '<i class="fas fa-times-circle text-danger"></i> נדחה'}
                            ${offer.respondedAt ? ` - ${formatDate(offer.respondedAt)}` : ''}
                        </small>
                    </div>
                `}
            </div>
        </div>
    `).join('');
}

function getStatusText(status) {
    const statusMap = {
        'PENDING': 'ממתין',
        'ACCEPTED': 'אושר',
        'DECLINED': 'נדחה'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return "לא זמין";
    const d = new Date(dateString);
    if (isNaN(d)) return "לא זמין";
    return d.toLocaleDateString("he-IL", { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(timeString) {
    if (!timeString) return "";
    return timeString.substring(0, 5);
}

function formatPrice(price) {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('he-IL');
}

async function acceptOffer(offerId) {
    if (!confirm('האם אתה בטוח שברצונך לקבל את הצעת העבודה?')) {
        return;
    }
    
    try {
        const response = await fetch(`${OFFERS_URL}/${offerId}/accept`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'שגיאה באישור הצעת העבודה');
        }

        alert('הצעת העבודה אושרה בהצלחה!');
        await loadOffers();
        
    } catch (error) {
        console.error('Error accepting offer:', error);
        alert('שגיאה: ' + error.message);
    }
}

async function declineOffer(offerId) {
    if (!confirm('האם אתה בטוח שברצונך לדחות את הצעת העבודה?')) {
        return;
    }
    
    try {
        const response = await fetch(`${OFFERS_URL}/${offerId}/decline`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'שגיאה בדחיית הצעת העבודה');
        }

        alert('הצעת העבודה נדחתה');
        await loadOffers();
        
    } catch (error) {
        console.error('Error declining offer:', error);
        alert('שגיאה: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

