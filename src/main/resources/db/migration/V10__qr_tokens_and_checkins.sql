CREATE TABLE qr_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    event_id BIGINT NOT NULL,
    subject_type VARCHAR(20) NOT NULL, -- PARTICIPANT / WORKER

    participant_id BIGINT NULL,
    user_id BIGINT NULL,

    token VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_qr_tokens_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_qr_tokens_participant
        FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    CONSTRAINT fk_qr_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_qr_tokens_subject
        CHECK (
            (subject_type = 'PARTICIPANT' AND participant_id IS NOT NULL AND user_id IS NULL)
            OR
            (subject_type = 'WORKER' AND user_id IS NOT NULL AND participant_id IS NULL)
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX uq_qr_tokens_token ON qr_tokens(token);
CREATE INDEX idx_qr_tokens_event_id ON qr_tokens(event_id);
CREATE INDEX idx_qr_tokens_participant_id ON qr_tokens(participant_id);
CREATE INDEX idx_qr_tokens_user_id ON qr_tokens(user_id);

-- Check-ins (attendance) - split tables to enforce uniqueness cleanly
CREATE TABLE participant_checkins (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,
    participant_id BIGINT NOT NULL,
    scanned_by_user_id BIGINT NULL,
    scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_participant_checkins_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_participant_checkins_participant
        FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    CONSTRAINT fk_participant_checkins_scanned_by
        FOREIGN KEY (scanned_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX uq_participant_checkins_event_participant ON participant_checkins(event_id, participant_id);
CREATE INDEX idx_participant_checkins_event_id ON participant_checkins(event_id);
CREATE INDEX idx_participant_checkins_scanned_at ON participant_checkins(scanned_at);

CREATE TABLE worker_checkins (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    scanned_by_user_id BIGINT NULL,
    scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_worker_checkins_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_worker_checkins_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_worker_checkins_scanned_by
        FOREIGN KEY (scanned_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX uq_worker_checkins_event_user ON worker_checkins(event_id, user_id);
CREATE INDEX idx_worker_checkins_event_id ON worker_checkins(event_id);
CREATE INDEX idx_worker_checkins_scanned_at ON worker_checkins(scanned_at);


