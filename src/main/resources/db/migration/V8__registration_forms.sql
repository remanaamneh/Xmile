CREATE TABLE registration_forms (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,

    title VARCHAR(200) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_registration_forms_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX uq_registration_forms_event_id ON registration_forms(event_id);
CREATE INDEX idx_registration_forms_event_id ON registration_forms(event_id);

CREATE TABLE registration_form_fields (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    form_id BIGINT NOT NULL,

    field_key VARCHAR(64) NOT NULL,
    label VARCHAR(160) NOT NULL,
    field_type VARCHAR(30) NOT NULL,
    is_required TINYINT(1) NOT NULL DEFAULT 0,
    options_text TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_registration_form_fields_form
        FOREIGN KEY (form_id) REFERENCES registration_forms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX uq_registration_form_fields_form_key ON registration_form_fields(form_id, field_key);
CREATE INDEX idx_registration_form_fields_form_id ON registration_form_fields(form_id);
CREATE INDEX idx_registration_form_fields_sort_order ON registration_form_fields(form_id, sort_order);


