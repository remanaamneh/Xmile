CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,

    channel VARCHAR(20) NOT NULL, -- EMAIL / SMS / WHATSAPP
    title VARCHAR(200) NULL,
    body TEXT NOT NULL,

    scheduled_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX idx_notifications_event_id ON notifications(event_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled_at ON notifications(scheduled_at);

CREATE TABLE notification_recipients (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    notification_id BIGINT NOT NULL,

    recipient_type VARCHAR(20) NOT NULL, -- USER / PARTICIPANT
    user_id BIGINT NULL,
    participant_id BIGINT NULL,
    destination VARCHAR(190) NULL, -- actual address/phone used at send time

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMP NULL,
    error_message TEXT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_recipients_notification
        FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_recipients_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_recipients_participant
        FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    CONSTRAINT chk_notification_recipients_subject
        CHECK (
            (recipient_type = 'USER' AND user_id IS NOT NULL AND participant_id IS NULL)
            OR
            (recipient_type = 'PARTICIPANT' AND participant_id IS NOT NULL AND user_id IS NULL)
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX idx_notification_recipients_notification_id ON notification_recipients(notification_id);
CREATE INDEX idx_notification_recipients_status ON notification_recipients(status);


