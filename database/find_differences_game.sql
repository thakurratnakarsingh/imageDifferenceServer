-- Find 10 Differences — MySQL 8 / MariaDB 10.4+ / XAMPP phpMyAdmin import
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
CREATE DATABASE IF NOT EXISTS find_differences_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE find_differences_game;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS game_attempts;
DROP TABLE IF EXISTS session_found_differences;
DROP TABLE IF EXISTS game_sessions;
DROP TABLE IF EXISTS player_progress;
DROP TABLE IF EXISTS player_actress_selections;
DROP TABLE IF EXISTS image_analysis_results;
DROP TABLE IF EXISTS puzzle_generation_jobs;
DROP TABLE IF EXISTS level_differences;
DROP TABLE IF EXISTS levels;
DROP TABLE IF EXISTS splash_screens;
DROP TABLE IF EXISTS app_settings;
DROP TABLE IF EXISTS actresses;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;

CREATE TABLE admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL, email VARCHAR(190) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','editor') NOT NULL DEFAULT 'editor', is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NULL, email VARCHAR(190) NULL UNIQUE,
  password_hash VARCHAR(255) NULL, device_id VARCHAR(190) NULL UNIQUE, current_level INT UNSIGNED NOT NULL DEFAULT 1,
  highest_unlocked_level INT UNSIGNED NOT NULL DEFAULT 1, total_score INT NOT NULL DEFAULT 0,
  coins INT NOT NULL DEFAULT 0, is_blocked TINYINT(1) NOT NULL DEFAULT 0, last_played_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE actresses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL, slug VARCHAR(140) NOT NULL UNIQUE,
  country VARCHAR(80) NOT NULL, industry VARCHAR(80) NOT NULL, description TEXT NULL,
  profile_image VARCHAR(500) NULL, is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_actresses_active (is_active), INDEX idx_actresses_country_industry (country, industry)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE levels (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, level_number INT UNSIGNED NOT NULL UNIQUE, actress_id INT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL DEFAULT 'Find 10 Differences', original_image_path VARCHAR(500) NOT NULL,
  modified_image_path VARCHAR(500) NULL, preview_image_path VARCHAR(500) NULL,
  image_width INT UNSIGNED NOT NULL, image_height INT UNSIGNED NOT NULL,
  difficulty ENUM('easy','medium','hard','expert') NOT NULL, time_limit INT UNSIGNED NOT NULL DEFAULT 180,
  maximum_lives TINYINT UNSIGNED NOT NULL DEFAULT 5, maximum_hints TINYINT UNSIGNED NOT NULL DEFAULT 3,
  completion_bonus INT NOT NULL DEFAULT 500, generation_provider ENUM('local','ai','hybrid') NOT NULL DEFAULT 'local',
  generation_status VARCHAR(30) NOT NULL DEFAULT 'pending', validation_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  review_status VARCHAR(30) NOT NULL DEFAULT 'draft', is_active TINYINT(1) NOT NULL DEFAULT 0,
  approved_by INT UNSIGNED NULL, approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_levels_actress FOREIGN KEY (actress_id) REFERENCES actresses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_levels_approver FOREIGN KEY (approved_by) REFERENCES admins(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_level_number CHECK (level_number BETWEEN 1 AND 1000),
  INDEX idx_levels_generation (generation_status), INDEX idx_levels_validation (validation_status),
  INDEX idx_levels_review (review_status), INDEX idx_levels_difficulty (difficulty), INDEX idx_levels_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE level_differences (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, level_id INT UNSIGNED NOT NULL,
  difference_number TINYINT UNSIGNED NOT NULL, shape_type ENUM('circle','rectangle') NOT NULL,
  modification_type VARCHAR(50) NOT NULL, normalized_x DECIMAL(9,6) NOT NULL, normalized_y DECIMAL(9,6) NOT NULL,
  normalized_width DECIMAL(9,6) NULL, normalized_height DECIMAL(9,6) NULL, normalized_radius DECIMAL(9,6) NULL,
  source_region_x INT UNSIGNED NULL, source_region_y INT UNSIGNED NULL, source_region_width INT UNSIGNED NULL, source_region_height INT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL, confidence_score DECIMAL(5,4) NOT NULL DEFAULT .9000,
  difficulty_score DECIMAL(5,4) NOT NULL DEFAULT .5000, is_automatically_generated TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_difference_level FOREIGN KEY (level_id) REFERENCES levels(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_difference_number CHECK (difference_number BETWEEN 1 AND 10),
  CONSTRAINT chk_normalized_coordinates CHECK (normalized_x BETWEEN 0 AND 1 AND normalized_y BETWEEN 0 AND 1),
  UNIQUE KEY uq_level_difference_number (level_id, difference_number), INDEX idx_difference_active (level_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE puzzle_generation_jobs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, job_uuid CHAR(36) NOT NULL UNIQUE, level_id INT UNSIGNED NOT NULL,
  provider VARCHAR(20) NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'pending', progress TINYINT UNSIGNED NOT NULL DEFAULT 0,
  current_step VARCHAR(255) NOT NULL DEFAULT 'Queued', attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  maximum_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5, error_code VARCHAR(80) NULL, error_message TEXT NULL,
  started_at DATETIME NULL, completed_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_job_level FOREIGN KEY (level_id) REFERENCES levels(id) ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_jobs_status (status), INDEX idx_jobs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE image_analysis_results (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, level_id INT UNSIGNED NOT NULL UNIQUE,
  face_regions_json JSON NULL, protected_regions_json JSON NULL, candidate_regions_json JSON NULL,
  difference_mask_path VARCHAR(500) NULL, similarity_score DECIMAL(8,6) NULL, changed_area_ratio DECIMAL(8,6) NULL,
  detected_component_count INT UNSIGNED NULL, validation_report_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_analysis_level FOREIGN KEY (level_id) REFERENCES levels(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE splash_screens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, title VARCHAR(180) NOT NULL, subtitle VARCHAR(255) NULL,
  logo_path VARCHAR(500) NULL, background_image_path VARCHAR(500) NULL, background_color CHAR(7) NOT NULL DEFAULT '#071815',
  text_color CHAR(7) NOT NULL DEFAULT '#FFFFFF', display_duration INT UNSIGNED NOT NULL DEFAULT 1800,
  is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_splash_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE player_actress_selections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NULL, device_id VARCHAR(190) NOT NULL,
  actress_id INT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_selection_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_selection_actress FOREIGN KEY (actress_id) REFERENCES actresses(id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE KEY uq_device_actress (device_id, actress_id), INDEX idx_selection_device (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE player_progress (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NULL, device_id VARCHAR(190) NOT NULL UNIQUE,
  current_level INT UNSIGNED NOT NULL DEFAULT 1, highest_unlocked_level INT UNSIGNED NOT NULL DEFAULT 1,
  total_score INT NOT NULL DEFAULT 0, coins INT NOT NULL DEFAULT 0, total_stars INT UNSIGNED NOT NULL DEFAULT 0,
  completed_levels INT UNSIGNED NOT NULL DEFAULT 0, last_played_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE game_sessions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, session_token CHAR(36) NOT NULL UNIQUE, user_id INT UNSIGNED NULL,
  device_id VARCHAR(190) NOT NULL, level_id INT UNSIGNED NOT NULL, started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL, session_status VARCHAR(30) NOT NULL DEFAULT 'active',
  remaining_lives TINYINT UNSIGNED NOT NULL, remaining_hints TINYINT UNSIGNED NOT NULL,
  found_count TINYINT UNSIGNED NOT NULL DEFAULT 0, score_earned INT NOT NULL DEFAULT 0,
  wrong_taps INT UNSIGNED NOT NULL DEFAULT 0, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_session_level FOREIGN KEY (level_id) REFERENCES levels(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_session_device (device_id), INDEX idx_session_status (session_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE session_found_differences (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, session_id INT UNSIGNED NOT NULL, difference_id INT UNSIGNED NOT NULL,
  found_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, tap_x DECIMAL(9,6) NOT NULL, tap_y DECIMAL(9,6) NOT NULL,
  image_type ENUM('original','modified') NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_found_session FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_found_difference FOREIGN KEY (difference_id) REFERENCES level_differences(id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE KEY uq_session_difference (session_id, difference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE game_attempts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, session_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NULL,
  device_id VARCHAR(190) NOT NULL, level_id INT UNSIGNED NOT NULL, is_completed TINYINT(1) NOT NULL,
  time_taken INT UNSIGNED NOT NULL, wrong_taps INT UNSIGNED NOT NULL DEFAULT 0, hints_used TINYINT UNSIGNED NOT NULL DEFAULT 0,
  score_earned INT NOT NULL DEFAULT 0, stars_earned TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attempt_session FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_attempt_level FOREIGN KEY (level_id) REFERENCES levels(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_attempt_level (level_id), INDEX idx_attempt_device (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE app_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, setting_key VARCHAR(120) NOT NULL UNIQUE, setting_value TEXT NOT NULL,
  setting_type ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string', description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, admin_id INT UNSIGNED NULL, action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL, entity_id VARCHAR(80) NULL, details_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admins (id,name,email,password_hash,role) VALUES
(1,'Development Admin','admin@example.com','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.','admin');

INSERT INTO actresses (id,name,slug,country,industry,description) VALUES
(1,'Aanya Rao','aanya-rao','India','Hindi Cinema','Licensed demo category'),
(2,'Maya Chen','maya-chen','Singapore','International','Licensed demo category'),
(3,'Sofia Reyes','sofia-reyes','Spain','European Cinema','Licensed demo category'),
(4,'Amara Okafor','amara-okafor','Nigeria','Nollywood','Licensed demo category'),
(5,'Hana Sato','hana-sato','Japan','Japanese Cinema','Licensed demo category'),
(6,'Isla Bennett','isla-bennett','United Kingdom','British Cinema','Licensed demo category'),
(7,'Lina Haddad','lina-haddad','Lebanon','Arabic Cinema','Licensed demo category'),
(8,'Camila Torres','camila-torres','Mexico','Latin Cinema','Licensed demo category'),
(9,'Nari Kim','nari-kim','South Korea','Korean Cinema','Licensed demo category'),
(10,'Zoe Martin','zoe-martin','Canada','International','Licensed demo category');

INSERT INTO splash_screens (title,subtitle,background_color,text_color,display_duration,is_active)
VALUES ('Find 10 Differences','Look closer. Tap smarter.','#071815','#FFFFFF',1800,1);

INSERT INTO users (id,name,email,password_hash,device_id,current_level,highest_unlocked_level,total_score,coins)
VALUES (1,'Sample Player','player@example.com',NULL,'sample-device',2,2,1250,150);
INSERT INTO player_progress (user_id,device_id,current_level,highest_unlocked_level,total_score,coins,total_stars,completed_levels)
VALUES (1,'sample-device',2,2,1250,150,3,1);

INSERT INTO levels (id,level_number,actress_id,title,original_image_path,modified_image_path,preview_image_path,image_width,image_height,difficulty,time_limit,maximum_lives,maximum_hints,completion_bonus,generation_provider,generation_status,validation_status,review_status,is_active,approved_by,approved_at)
VALUES (1,1,1,'Garden Studio','uploads/levels/sample/original.png','uploads/levels/sample/modified.png','uploads/levels/sample/preview.png',1200,800,'easy',180,5,3,500,'local','completed','passed','approved',1,1,NOW());

INSERT INTO level_differences
(level_id,difference_number,shape_type,modification_type,normalized_x,normalized_y,normalized_width,normalized_height,normalized_radius,source_region_x,source_region_y,source_region_width,source_region_height,description,confidence_score,difficulty_score)
VALUES
(1,1,'circle','colour_change',.125,.175,NULL,NULL,.050,90,100,70,70,'Flower colour changed',.98,.20),
(1,2,'rectangle','object_addition',.270,.110,.080,.090,NULL,324,88,96,72,'A star was added',.97,.20),
(1,3,'circle','shape_change',.500,.180,NULL,NULL,.050,565,110,70,70,'Sun shape changed',.95,.20),
(1,4,'rectangle','pattern_change',.690,.100,.080,.090,NULL,828,80,96,72,'Cloud pattern changed',.95,.20),
(1,5,'circle','object_removal',.875,.190,NULL,NULL,.050,1015,117,70,70,'A small bird disappeared',.96,.20),
(1,6,'rectangle','colour_change',.090,.550,.080,.090,NULL,108,440,96,72,'Pot colour changed',.98,.20),
(1,7,'circle','object_addition',.310,.630,NULL,NULL,.050,337,469,70,70,'A butterfly was added',.97,.20),
(1,8,'rectangle','rotation',.480,.560,.080,.090,NULL,576,448,96,72,'Sign was rotated',.94,.20),
(1,9,'circle','pattern_change',.710,.650,NULL,NULL,.050,817,485,70,70,'Bush pattern changed',.95,.20),
(1,10,'rectangle','shape_change',.840,.540,.080,.090,NULL,1008,432,96,72,'Window shape changed',.96,.20);

INSERT INTO puzzle_generation_jobs (job_uuid,level_id,provider,status,progress,current_step,attempt_count,maximum_attempts,started_at,completed_at)
VALUES ('00000000-0000-4000-8000-000000000001',1,'local','completed',100,'Ready for review',1,5,NOW(),NOW());

INSERT INTO app_settings (setting_key,setting_value,setting_type,description) VALUES
('correct_points','100','number','Points for a correct difference'),
('wrong_tap_penalty','25','number','Points removed for a wrong tap'),
('completion_bonus','500','number','Level completion bonus'),
('unused_hint_bonus','50','number','Bonus for each unused hint'),
('no_wrong_tap_bonus','200','number','Perfect accuracy bonus'),
('touch_tolerance','0.015','number','Normalized tap tolerance'),
('max_generation_retries','5','number','Automatic generation attempts'),
('pixel_diff_threshold','20','number','Minimum channel difference');

SET FOREIGN_KEY_CHECKS = 1;
