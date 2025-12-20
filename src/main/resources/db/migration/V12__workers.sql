CREATE TABLE worker_profiles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,

    phone VARCHAR(30) NULL,
    home_lat DECIMAL(9,6) NULL,
    home_lng DECIMAL(9,6) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_worker_profiles_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX uq_worker_profiles_user_id ON worker_profiles(user_id);
CREATE INDEX idx_worker_profiles_active ON worker_profiles(is_active);
CREATE INDEX idx_worker_profiles_home_lat_lng ON worker_profiles(home_lat, home_lng);

CREATE TABLE event_worker_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,

    required_count INT NOT NULL,
    radius_km DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,

    CONSTRAINT fk_event_worker_requests_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX idx_event_worker_requests_event_id ON event_worker_requests(event_id);
CREATE INDEX idx_event_worker_requests_status ON event_worker_requests(status);

CREATE TABLE worker_applications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    request_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'INVITED',
    distance_km DECIMAL(6,2) NULL,
    invited_at TIMESTAMP NULL,
    responded_at TIMESTAMP NULL,
    assigned_at TIMESTAMP NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_worker_applications_request
        FOREIGN KEY (request_id) REFERENCES event_worker_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_worker_applications_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX uq_worker_applications_request_user ON worker_applications(request_id, user_id);
CREATE INDEX idx_worker_applications_status ON worker_applications(status);


