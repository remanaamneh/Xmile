CREATE TABLE event_quotes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    event_id BIGINT NOT NULL,
    production_company_id BIGINT NOT NULL,

    quote_amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ILS',

    xmile_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    notes TEXT NULL,

    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_quotes_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_quotes_production_company
        FOREIGN KEY (production_company_id) REFERENCES production_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX idx_event_quotes_event_id ON event_quotes(event_id);
CREATE INDEX idx_event_quotes_production_company_id ON event_quotes(production_company_id);
CREATE INDEX idx_event_quotes_status ON event_quotes(status);

-- Store the approved/selected quote on the event (added after event_quotes exists)
ALTER TABLE events
  ADD COLUMN accepted_quote_id BIGINT NULL;

ALTER TABLE events
  ADD CONSTRAINT fk_events_accepted_quote
    FOREIGN KEY (accepted_quote_id) REFERENCES event_quotes(id);

CREATE INDEX idx_events_accepted_quote_id ON events(accepted_quote_id);


