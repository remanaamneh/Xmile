CREATE TABLE events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    client_user_id BIGINT NOT NULL,
    company_id BIGINT NULL,
    production_company_id BIGINT NULL,

    name VARCHAR(200) NOT NULL,
    location VARCHAR(255) NOT NULL,
    location_lat DECIMAL(9,6) NULL,
    location_lng DECIMAL(9,6) NULL,

    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    participant_count INT NOT NULL,

    xmile_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_events_client_user
        FOREIGN KEY (client_user_id) REFERENCES users(id),
    CONSTRAINT fk_events_company
        FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_events_production_company
        FOREIGN KEY (production_company_id) REFERENCES production_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_events_client_user_id ON events(client_user_id);
CREATE INDEX idx_events_company_id ON events(company_id);
CREATE INDEX idx_events_production_company_id ON events(production_company_id);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_location_lat_lng ON events(location_lat, location_lng);


