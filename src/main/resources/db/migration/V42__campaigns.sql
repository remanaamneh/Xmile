-- Campaign system migration
-- Creates tables for campaign management: templates, campaigns, and recipients

CREATE TABLE IF NOT EXISTS campaign_templates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(120) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  tags VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS campaigns (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT NOT NULL,
  client_user_id BIGINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  channel ENUM('EMAIL','SMS','WHATSAPP') NULL,
  subject VARCHAR(200) NULL,
  message_text TEXT NULL,
  ai_prompt TEXT NULL,
  template_id BIGINT NULL,
  status ENUM('DRAFT','READY','SENT','FAILED') NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_campaign_template FOREIGN KEY (template_id) REFERENCES campaign_templates(id),
  CONSTRAINT fk_campaign_event FOREIGN KEY (event_id) REFERENCES events(id),
  CONSTRAINT fk_campaign_client_user FOREIGN KEY (client_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  campaign_id BIGINT NOT NULL,
  full_name VARCHAR(120) NULL,
  email VARCHAR(200) NULL,
  phone VARCHAR(50) NULL,
  whatsapp VARCHAR(50) NULL,
  status ENUM('PENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
  error_msg VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rec_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed templates
INSERT INTO campaign_templates(code,title,image_url,tags) VALUES
('DESIGN_1','תודה שבחרתם בנו!','/assets/campaign/design1.jpg','thanks,gift'),
('DESIGN_2','עדכון שעות פעילות','/assets/campaign/design2.jpg','update,hours'),
('DESIGN_3','ברוכים הבאים לשנה החדשה','/assets/campaign/design3.jpg','greeting,newyear'),
('DESIGN_4','מבצע קיץ מטורף','/assets/campaign/design4.jpg','sale,summer'),
('DESIGN_5','קמפיין לספקים','/assets/campaign/design5.jpg','suppliers,info');

CREATE INDEX idx_campaigns_client_user_id ON campaigns(client_user_id);
CREATE INDEX idx_campaigns_event_id ON campaigns(event_id);
CREATE INDEX idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);

