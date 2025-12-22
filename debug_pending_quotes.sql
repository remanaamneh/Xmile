-- Debug SQL query to check pending quotes
-- This query should return the same records as GET /admin/quotes/pending

-- Check all quotes with pending statuses
SELECT 
    eq.id AS quote_id,
    eq.status AS quote_status,
    eq.event_id,
    e.name AS event_name,
    e.status AS event_status,
    e.client_user_id,
    u.name AS client_user_name,
    u.email AS client_user_email,
    eq.production_company_id,
    eq.created_at,
    eq.updated_at
FROM event_quotes eq
LEFT JOIN events e ON eq.event_id = e.id
LEFT JOIN users u ON e.client_user_id = u.id
WHERE eq.status IN ('QUOTE_PENDING', 'SENT_TO_MANAGER')
ORDER BY eq.created_at DESC;

-- Count by status
SELECT 
    status,
    COUNT(*) AS count
FROM event_quotes
WHERE status IN ('QUOTE_PENDING', 'SENT_TO_MANAGER')
GROUP BY status;

-- Check if there are any quotes with these statuses that might be filtered out
SELECT 
    eq.id,
    eq.status,
    eq.event_id,
    eq.production_company_id,
    CASE 
        WHEN eq.production_company_id IS NULL THEN 'No production company'
        ELSE 'Has production company'
    END AS production_company_status
FROM event_quotes eq
WHERE eq.status IN ('QUOTE_PENDING', 'SENT_TO_MANAGER');

