CREATE TABLE participants (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    event_id BIGINT NOT NULL,
    registration_form_id BIGINT NULL,

    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(190) NULL,
    phone VARCHAR(30) NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED',
    form_response_text TEXT NULL,
    confirmed_at TIMESTAMP NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_participants_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_participants_registration_form
        FOREIGN KEY (registration_form_id) REFERENCES registration_forms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX idx_participants_event_id ON participants(event_id);
CREATE INDEX idx_participants_status ON participants(status);
CREATE INDEX idx_participants_email ON participants(email);


