-- Banjare MySQL 8 schema. Run with:
-- mysql -u <user> -p <database> < schema.sql
CREATE TABLE IF NOT EXISTS tourists (
  id CHAR(36) PRIMARY KEY,
  phone VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL DEFAULT 'Rajasthan traveller',
  digital_id VARCHAR(80) UNIQUE,
  id_status ENUM('unregistered','pending','verified','flagged','rejected') NOT NULL DEFAULT 'unregistered',
  emergency_contact VARCHAR(120),
  last_lat DECIMAL(10,7), last_lng DECIMAL(10,7), last_seen DATETIME(3),
  risk TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
CREATE TABLE IF NOT EXISTS zones (
  id CHAR(36) PRIMARY KEY, name VARCHAR(120) NOT NULL,
  type ENUM('safe','monitored','restricted') NOT NULL,
  lat DECIMAL(10,7) NOT NULL, lng DECIMAL(10,7) NOT NULL,
  radius_m INT UNSIGNED NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
CREATE TABLE IF NOT EXISTS response_teams (
  id CHAR(36) PRIMARY KEY, name VARCHAR(120) NOT NULL, base VARCHAR(120) NOT NULL,
  status ENUM('available','busy','offline') NOT NULL DEFAULT 'available',
  lat DECIMAL(10,7), lng DECIMAL(10,7), created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
CREATE TABLE IF NOT EXISTS incidents (
  id CHAR(36) PRIMARY KEY, code VARCHAR(32) NOT NULL UNIQUE,
  type ENUM('sos','zone_breach','unauthorized','medical','hazard','lost') NOT NULL,
  severity ENUM('low','medium','high','critical') NOT NULL,
  status ENUM('open','in-progress','resolved') NOT NULL DEFAULT 'open',
  tourist_id CHAR(36), zone_id CHAR(36), team_id CHAR(36),
  lat DECIMAL(10,7), lng DECIMAL(10,7), description TEXT, media_url TEXT,
  record_hash CHAR(64), blockchain_tx_hash VARCHAR(100), resolved_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (tourist_id) REFERENCES tourists(id) ON DELETE SET NULL,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL,
  FOREIGN KEY (team_id) REFERENCES response_teams(id) ON DELETE SET NULL,
  INDEX incidents_status_created (status, created_at), INDEX incidents_tourist (tourist_id, created_at)
);
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY, tourist_id CHAR(36) NOT NULL, title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL, is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (tourist_id) REFERENCES tourists(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS authority_users (
  id CHAR(36) PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL, role ENUM('operator','supervisor','admin') NOT NULL DEFAULT 'operator',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
INSERT IGNORE INTO zones (id,name,type,lat,lng,radius_m) VALUES
 (UUID(),'Amer Fort corridor','safe',26.9855,75.8513,900),(UUID(),'Hawa Mahal district','monitored',26.9239,75.8267,700),
 (UUID(),'Nahargarh trail','restricted',26.9372,75.8156,1100),(UUID(),'Ranthambore core','restricted',26.0173,76.5026,2400),
 (UUID(),'Mehrangarh approach','monitored',26.2987,73.0188,800),(UUID(),'Sam Dunes','safe',26.8732,70.6798,1200),
 (UUID(),'Pushkar lakefront','safe',26.4897,74.5511,850),(UUID(),'Jaipur airport corridor','monitored',26.8242,75.8122,1000);
INSERT IGNORE INTO response_teams (id,name,base,status) VALUES
 (UUID(),'Team Suraksha','Jaipur North','busy'),(UUID(),'Jaipur North','Hawa Mahal','available'),
 (UUID(),'Desert Watch','Jaisalmer','available'),(UUID(),'Tiger Response','Ranthambore','available');
