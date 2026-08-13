-- ============================================================================
-- Multi-Tenant Government Contract & Payment Management System
-- MySQL 8.0+ DDL
--
-- Multi-tenancy model : SHARED SCHEMA, department_id on every tenant-scoped
--                        table (as requested). Row-level isolation must be
--                        enforced in the application layer (every query
--                        scoped by the logged-in user's department_id).
-- Engine               : InnoDB (foreign keys, transactions, row locking --
--                        required for the budget guardrail triggers below).
-- Charset              : utf8mb4 (rupee symbol, regional names, GSTIN, etc.)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS govt_contract_system
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

USE govt_contract_system;

SET NAMES utf8mb4;

-- ============================================================================
-- SECTION 1: LOOKUP / REFERENCE TABLES
-- ============================================================================

CREATE TABLE gst_state_codes (
  state_code   CHAR(2)      NOT NULL PRIMARY KEY,
  state_name   VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE roles (
  id            TINYINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  role_code     VARCHAR(30)  NOT NULL UNIQUE,   -- SUPER_ADMIN, DEPARTMENT_ADMIN, EXECUTIVE_ENGINEER, DATA_ENTRY_OPERATOR, AUDITOR
  role_name     VARCHAR(60)  NOT NULL,
  description   VARCHAR(255) NULL,
  is_system_role TINYINT(1)  NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE modules (
  id           TINYINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  module_code  VARCHAR(50)  NOT NULL UNIQUE,   -- CONTRACTOR_MASTER, SCHEME_MASTER, WORK_MASTER, PAYMENT_ENTRY, ...
  module_name  VARCHAR(100) NOT NULL,
  description  VARCHAR(255) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 2: TENANT (DEPARTMENT) & IDENTITY
-- ============================================================================

CREATE TABLE departments (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_code         VARCHAR(20)  NOT NULL UNIQUE,        -- e.g. 'PWD-KA', used in URLs/subdomains
  department_name     VARCHAR(150) NOT NULL,
  office_address      VARCHAR(255) NULL,
  district            VARCHAR(100) NULL,
  state               VARCHAR(100) NULL,
  gstin               CHAR(15)     NULL UNIQUE,
  state_code          CHAR(2) GENERATED ALWAYS AS (LEFT(gstin, 2)) STORED,  -- derived from GSTIN, same pattern as contractors.gst_state_code - avoids the state/state_code/gstin drifting out of sync
  pan                 CHAR(10)     NULL UNIQUE,
  tan                 VARCHAR(10)  NULL,
  official_email      VARCHAR(150) NULL,
  contact_number      VARCHAR(20)  NULL,
  logo_path           VARCHAR(255) NULL,
  status              ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_by          BIGINT UNSIGNED NULL,                -- FK to users.id, added after users table exists (circular ref)
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dept_state_code FOREIGN KEY (state_code) REFERENCES gst_state_codes(state_code)
) ENGINE=InnoDB;

CREATE TABLE ddo_details (
  id                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  department_id               BIGINT UNSIGNED NOT NULL,
  ddo_name                    VARCHAR(150) NOT NULL,
  designation                 VARCHAR(150) NOT NULL,       -- e.g. 'Executive Engineer'
  ddo_code                    VARCHAR(50)  NULL,
  treasury_registration_code  VARCHAR(50)  NULL,
  is_primary                  TINYINT(1)   NOT NULL DEFAULT 1,
  status                      ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ddo_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  INDEX idx_ddo_department (department_id)
) ENGINE=InnoDB;

CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  department_id BIGINT UNSIGNED NULL,           -- NULL = Super Admin (software company staff)
  role_id       TINYINT UNSIGNED NOT NULL,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  phone         VARCHAR(20)  NULL,
  password_hash VARCHAR(255) NOT NULL,
  status        ENUM('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  last_login_at DATETIME NULL,
  created_by    BIGINT UNSIGNED NULL,           -- self-reference: which user created this account
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_users_role       FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_users_department (department_id)
) ENGINE=InnoDB;

-- deferred FK now that users exists (breaks the departments <-> users circular dependency)
ALTER TABLE departments
  ADD CONSTRAINT fk_departments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- SECTION 3: RBAC - SUBSCRIPTION (SUPER ADMIN) & USER PERMISSIONS (DEPT ADMIN)
-- ============================================================================

CREATE TABLE department_modules (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  department_id BIGINT UNSIGNED NOT NULL,
  module_id     TINYINT UNSIGNED NOT NULL,
  is_enabled    TINYINT(1) NOT NULL DEFAULT 1,
  enabled_by    BIGINT UNSIGNED NULL,
  enabled_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deptmod_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_deptmod_module     FOREIGN KEY (module_id) REFERENCES modules(id),
  CONSTRAINT fk_deptmod_enabled_by FOREIGN KEY (enabled_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_department_module (department_id, module_id)
) ENGINE=InnoDB;

CREATE TABLE user_module_permissions (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  module_id  TINYINT UNSIGNED NOT NULL,
  can_view   TINYINT(1) NOT NULL DEFAULT 0,
  can_create TINYINT(1) NOT NULL DEFAULT 0,
  can_edit   TINYINT(1) NOT NULL DEFAULT 0,
  can_delete TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_userperm_user   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_userperm_module FOREIGN KEY (module_id) REFERENCES modules(id),
  UNIQUE KEY uq_user_module (user_id, module_id)
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 4: MASTER DATA - CONTRACTORS, SCHEMES, WORKS
-- ============================================================================

CREATE TABLE contractors (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  department_id       BIGINT UNSIGNED NOT NULL,
  firm_name           VARCHAR(150) NOT NULL,
  vendor_code         VARCHAR(30)  NULL,
  pan_number          CHAR(10)     NOT NULL,
  gstin               CHAR(15)     NULL,
  gst_state_code      CHAR(2) GENERATED ALWAYS AS (LEFT(gstin, 2)) STORED,  -- derived, used for intra/inter-state GST TDS split
  address             VARCHAR(255) NULL,
  contact_person      VARCHAR(150) NULL,
  phone               VARCHAR(20)  NULL,
  email               VARCHAR(150) NULL,
  bank_name           VARCHAR(150) NULL,
  bank_branch         VARCHAR(150) NULL,
  account_number      VARCHAR(30)  NULL,
  ifsc_code           VARCHAR(11)  NULL,
  account_holder_name VARCHAR(150) NULL,
  status              ENUM('ACTIVE','INACTIVE','BLACKLISTED') NOT NULL DEFAULT 'ACTIVE',
  created_by          BIGINT UNSIGNED NULL,
  updated_by          BIGINT UNSIGNED NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_contractor_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_contractor_gst_state  FOREIGN KEY (gst_state_code) REFERENCES gst_state_codes(state_code),
  CONSTRAINT fk_contractor_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_contractor_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_contractor_pan_per_dept (department_id, pan_number),
  UNIQUE KEY uq_contractor_vendor_code (department_id, vendor_code),
  INDEX idx_contractor_department (department_id),
  INDEX idx_contractor_gstin (gstin)
) ENGINE=InnoDB;

CREATE TABLE schemes (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  department_id     BIGINT UNSIGNED NOT NULL,
  scheme_name       VARCHAR(200) NOT NULL,
  financial_year    VARCHAR(9)   NOT NULL,      -- e.g. '2025-2026'
  sanctioned_budget DECIMAL(15,2) NOT NULL,
  description       VARCHAR(500) NULL,
  status            ENUM('ACTIVE','CLOSED') NOT NULL DEFAULT 'ACTIVE',
  created_by        BIGINT UNSIGNED NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_scheme_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_scheme_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_scheme_budget CHECK (sanctioned_budget > 0),
  UNIQUE KEY uq_scheme_name_per_year (department_id, scheme_name, financial_year),
  INDEX idx_scheme_department (department_id)
) ENGINE=InnoDB;

-- Contractor and agreement/contract details are deliberately NOT captured
-- here. A work order is just "what work, under which scheme, for how much
-- budget" - the contractor assignment and agreement number/date are entered
-- per-payment in the Payment Entry form (see payments.contractor_id and
-- payments.agreement_number_snapshot / agreement_date_snapshot below).
CREATE TABLE works (
  id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  department_id           BIGINT UNSIGNED NOT NULL,
  scheme_id               BIGINT UNSIGNED NOT NULL,
  work_name               VARCHAR(200) NOT NULL,
  sanctioned_cost         DECIMAL(15,2) NOT NULL,
  expected_completion_date DATE NULL,
  actual_completion_date   DATE NULL,
  status                  ENUM('ONGOING','COMPLETED','TERMINATED') NOT NULL DEFAULT 'ONGOING',
  created_by              BIGINT UNSIGNED NULL,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_work_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_work_scheme     FOREIGN KEY (scheme_id) REFERENCES schemes(id),
  CONSTRAINT fk_work_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_work_cost CHECK (sanctioned_cost > 0),
  INDEX idx_work_department (department_id),
  INDEX idx_work_scheme (scheme_id)
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 5: PAYMENT ENTRY (CORE TRANSACTION)
-- Column order matters: MySQL generated columns may only reference columns
-- defined earlier in the same CREATE TABLE statement.
-- ============================================================================

CREATE TABLE payments (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  department_id         BIGINT UNSIGNED NOT NULL,
  work_id               BIGINT UNSIGNED NOT NULL,
  contractor_id         BIGINT UNSIGNED NOT NULL,

  -- snapshots: certificates/reports must reflect facts as they were at the
  -- moment of payment, even if the contractor/work master is edited later
  contractor_name_snapshot  VARCHAR(150) NOT NULL,
  contractor_gstin_snapshot CHAR(15) NULL,
  work_name_snapshot         VARCHAR(200) NOT NULL,
  agreement_number_snapshot  VARCHAR(50) NOT NULL,
  agreement_date_snapshot    DATE NOT NULL,

  -- Part 2: invoice & base cost
  invoice_number   VARCHAR(50) NOT NULL,
  invoice_date     DATE NOT NULL,
  base_cost        DECIMAL(15,2) NOT NULL,                              -- (A)

  -- GST payable
  gst_rate            DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_rate_is_manual  TINYINT(1) NOT NULL DEFAULT 0,
  gst_amount          DECIMAL(15,2) GENERATED ALWAYS AS (ROUND(base_cost * gst_rate / 100, 2)) STORED,   -- (B)
  total_bill_value    DECIMAL(15,2) GENERATED ALWAYS AS (base_cost + gst_amount) STORED,                 -- (C)

  -- Income Tax TDS
  it_tds_rate           DECIMAL(5,2) NOT NULL DEFAULT 0,
  it_tds_rate_is_manual TINYINT(1) NOT NULL DEFAULT 0,
  it_tds_amount         DECIMAL(15,2) GENERATED ALWAYS AS (ROUND(base_cost * it_tds_rate / 100, 2)) STORED,

  -- GST TDS (intra-state splits into CGST+SGST, inter-state goes wholly to IGST)
  gst_tds_rate           DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_tds_rate_is_manual TINYINT(1) NOT NULL DEFAULT 0,
  gst_tds_type           ENUM('INTRA_STATE','INTER_STATE','NOT_APPLICABLE') NOT NULL DEFAULT 'NOT_APPLICABLE',
  cgst_tds_amount        DECIMAL(15,2) GENERATED ALWAYS AS (
                            CASE WHEN gst_tds_type = 'INTRA_STATE' THEN ROUND((base_cost * gst_tds_rate / 100) / 2, 2) ELSE 0 END
                          ) STORED,
  sgst_tds_amount        DECIMAL(15,2) GENERATED ALWAYS AS (
                            CASE WHEN gst_tds_type = 'INTRA_STATE' THEN ROUND((base_cost * gst_tds_rate / 100) / 2, 2) ELSE 0 END
                          ) STORED,
  igst_tds_amount        DECIMAL(15,2) GENERATED ALWAYS AS (
                            CASE WHEN gst_tds_type = 'INTER_STATE' THEN ROUND(base_cost * gst_tds_rate / 100, 2) ELSE 0 END
                          ) STORED,

  -- Labour Welfare Cess
  labour_cess_rate           DECIMAL(5,2) NOT NULL DEFAULT 0,
  labour_cess_rate_is_manual TINYINT(1) NOT NULL DEFAULT 0,
  labour_cess_amount         DECIMAL(15,2) GENERATED ALWAYS AS (ROUND(base_cost * labour_cess_rate / 100, 2)) STORED,

  -- Royalty (either a flat rupee amount or a % of base cost)
  royalty_type   ENUM('PERCENTAGE','FIXED_AMOUNT','NOT_APPLICABLE') NOT NULL DEFAULT 'NOT_APPLICABLE',
  royalty_value  DECIMAL(15,2) NOT NULL DEFAULT 0,
  royalty_amount DECIMAL(15,2) GENERATED ALWAYS AS (
                    CASE royalty_type
                      WHEN 'PERCENTAGE'    THEN ROUND(base_cost * royalty_value / 100, 2)
                      WHEN 'FIXED_AMOUNT'  THEN royalty_value
                      ELSE 0
                    END
                  ) STORED,

  -- Stamp Duty / Retention
  stamp_duty_type   ENUM('PERCENTAGE','FIXED_AMOUNT','NOT_APPLICABLE') NOT NULL DEFAULT 'NOT_APPLICABLE',
  stamp_duty_value  DECIMAL(15,2) NOT NULL DEFAULT 0,
  stamp_duty_amount DECIMAL(15,2) GENERATED ALWAYS AS (
                       CASE stamp_duty_type
                         WHEN 'PERCENTAGE'   THEN ROUND(base_cost * stamp_duty_value / 100, 2)
                         WHEN 'FIXED_AMOUNT' THEN stamp_duty_value
                         ELSE 0
                       END
                     ) STORED,

  -- Other deductions
  other_deduction_type    ENUM('PERCENTAGE','FIXED_AMOUNT','NOT_APPLICABLE') NOT NULL DEFAULT 'NOT_APPLICABLE',
  other_deduction_value   DECIMAL(15,2) NOT NULL DEFAULT 0,
  other_deduction_amount  DECIMAL(15,2) GENERATED ALWAYS AS (
                             CASE other_deduction_type
                               WHEN 'PERCENTAGE'   THEN ROUND(base_cost * other_deduction_value / 100, 2)
                               WHEN 'FIXED_AMOUNT' THEN other_deduction_value
                               ELSE 0
                             END
                           ) STORED,
  other_deduction_remarks VARCHAR(255) NULL,

  -- Totals
  total_deductions   DECIMAL(15,2) GENERATED ALWAYS AS (
                        it_tds_amount + cgst_tds_amount + sgst_tds_amount + igst_tds_amount +
                        labour_cess_amount + royalty_amount + stamp_duty_amount + other_deduction_amount
                      ) STORED,                                                                          -- (D)
  net_payable_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_bill_value - total_deductions) STORED,      -- (E)

  -- maintained by trigger (see Section 8) for "cumulative work done till date" on RA bills
  cumulative_gross_amount_till_date DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Part 3: treasury reference
  treasury_token_number VARCHAR(50) NULL,
  treasury_payment_date DATE NULL,
  remarks                VARCHAR(500) NULL,

  status              ENUM('SAVED','APPROVED','CANCELLED') NOT NULL DEFAULT 'SAVED',
  cancellation_reason VARCHAR(500) NULL,                    -- mandatory (enforced in app) when status = CANCELLED

  created_by  BIGINT UNSIGNED NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_payment_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_work       FOREIGN KEY (work_id) REFERENCES works(id),
  CONSTRAINT fk_payment_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id),
  CONSTRAINT fk_payment_created_by  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_payment_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT chk_payment_base_cost CHECK (base_cost > 0),
  CONSTRAINT chk_payment_gst_rate CHECK (gst_rate BETWEEN 0 AND 100),
  CONSTRAINT chk_payment_it_tds_rate CHECK (it_tds_rate BETWEEN 0 AND 100),
  CONSTRAINT chk_payment_gst_tds_rate CHECK (gst_tds_rate BETWEEN 0 AND 100),
  CONSTRAINT chk_payment_cess_rate CHECK (labour_cess_rate BETWEEN 0 AND 100),

  UNIQUE KEY uq_payment_work_invoice (work_id, invoice_number),
  INDEX idx_payment_department (department_id),
  INDEX idx_payment_work (work_id),
  INDEX idx_payment_contractor (contractor_id),
  INDEX idx_payment_status (status),
  INDEX idx_payment_treasury_token (treasury_token_number)
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 6: CERTIFICATES & REPORT GENERATION LOG
-- ============================================================================

CREATE TABLE work_experience_certificates (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  department_id            BIGINT UNSIGNED NOT NULL,
  work_id                  BIGINT UNSIGNED NOT NULL,
  contractor_id             BIGINT UNSIGNED NOT NULL,
  certificate_number        VARCHAR(50) NOT NULL,
  stated_completion_date    DATE NULL,
  actual_completion_date    DATE NULL,
  sanctioned_value          DECIMAL(15,2) NOT NULL,
  executed_value            DECIMAL(15,2) NOT NULL,
  performance_rating_label  VARCHAR(50) NULL,     -- e.g. 'EXCELLENT','GOOD','SATISFACTORY','POOR'
  performance_rating_score  DECIMAL(3,1) NULL,    -- optional numeric score, e.g. out of 10
  remarks                   VARCHAR(500) NULL,
  issued_by                 BIGINT UNSIGNED NOT NULL,
  issued_at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wec_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_wec_work       FOREIGN KEY (work_id) REFERENCES works(id),
  CONSTRAINT fk_wec_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id),
  CONSTRAINT fk_wec_issued_by  FOREIGN KEY (issued_by) REFERENCES users(id),
  UNIQUE KEY uq_wec_certificate_number (department_id, certificate_number),
  INDEX idx_wec_work (work_id)
) ENGINE=InnoDB;

CREATE TABLE certificate_logs (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  department_id     BIGINT UNSIGNED NOT NULL,
  certificate_type  ENUM('PAYMENT_CERTIFICATE','WORK_EXPERIENCE_CERTIFICATE','TAX_LEDGER_REPORT') NOT NULL,
  reference_table    VARCHAR(50) NOT NULL,        -- e.g. 'payments', 'works'
  reference_id       BIGINT UNSIGNED NOT NULL,
  file_format         ENUM('PDF','EXCEL','CSV') NOT NULL DEFAULT 'PDF',
  generated_by         BIGINT UNSIGNED NOT NULL,
  generated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes                 VARCHAR(255) NULL,
  CONSTRAINT fk_certlog_department  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_certlog_generated_by FOREIGN KEY (generated_by) REFERENCES users(id),
  INDEX idx_certlog_reference (reference_table, reference_id),
  INDEX idx_certlog_department (department_id)
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 7: AUDIT TRAIL & SECURITY LOGS
-- Written by the application layer (it has access to IP/user-agent/reason,
-- which a pure DB trigger cannot see). See note at bottom of file.
-- ============================================================================

CREATE TABLE audit_logs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  department_id BIGINT UNSIGNED NULL,             -- NULL for Super-Admin-level actions
  performed_by  BIGINT UNSIGNED NULL,
  table_name    VARCHAR(50) NOT NULL,
  record_id     BIGINT UNSIGNED NOT NULL,
  action        ENUM('CREATE','UPDATE','DELETE') NOT NULL,
  old_data      JSON NULL,
  new_data      JSON NULL,
  reason        VARCHAR(500) NULL,                -- mandatory for DELETE, enforced in app layer
  ip_address    VARCHAR(45) NULL,
  user_agent    VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_user       FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_table_record (table_name, record_id),
  INDEX idx_audit_department (department_id),
  INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE login_logs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NULL,
  login_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_at     DATETIME NULL,
  ip_address    VARCHAR(45) NULL,
  user_agent    VARCHAR(255) NULL,
  status        ENUM('SUCCESS','FAILED') NOT NULL,
  CONSTRAINT fk_loginlog_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_loginlog_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  INDEX idx_loginlog_user (user_id),
  INDEX idx_loginlog_login_at (login_at)
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 8: BUDGET GUARDRAIL TRIGGERS (defense in depth)
-- The UI's "Live Budget Meter" gives instant feedback, but these triggers are
-- the authoritative, unbypassable enforcement of the two rules:
--   Sanctioned Work Amount <= Remaining Scheme Budget
--   Current Invoice Base Cost <= Remaining Work Balance
-- They also maintain payments.cumulative_gross_amount_till_date for RA bills.
-- ============================================================================

DELIMITER $$

CREATE TRIGGER trg_works_before_insert_budget_check
BEFORE INSERT ON works
FOR EACH ROW
BEGIN
  DECLARE v_scheme_budget DECIMAL(15,2);
  DECLARE v_allocated DECIMAL(15,2);

  SELECT sanctioned_budget INTO v_scheme_budget FROM schemes WHERE id = NEW.scheme_id;
  SELECT IFNULL(SUM(sanctioned_cost), 0) INTO v_allocated
    FROM works WHERE scheme_id = NEW.scheme_id AND status <> 'TERMINATED';

  IF (v_allocated + NEW.sanctioned_cost) > v_scheme_budget THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sanctioned work cost exceeds remaining scheme budget.';
  END IF;
END$$

CREATE TRIGGER trg_works_before_update_budget_check
BEFORE UPDATE ON works
FOR EACH ROW
BEGIN
  DECLARE v_scheme_budget DECIMAL(15,2);
  DECLARE v_allocated DECIMAL(15,2);

  IF NEW.sanctioned_cost <> OLD.sanctioned_cost OR NEW.scheme_id <> OLD.scheme_id THEN
    SELECT sanctioned_budget INTO v_scheme_budget FROM schemes WHERE id = NEW.scheme_id;
    SELECT IFNULL(SUM(sanctioned_cost), 0) INTO v_allocated
      FROM works WHERE scheme_id = NEW.scheme_id AND status <> 'TERMINATED' AND id <> NEW.id;

    IF (v_allocated + NEW.sanctioned_cost) > v_scheme_budget THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sanctioned work cost exceeds remaining scheme budget.';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_payments_before_insert_budget_check
BEFORE INSERT ON payments
FOR EACH ROW
BEGIN
  DECLARE v_work_budget DECIMAL(15,2);
  DECLARE v_utilized DECIMAL(15,2);

  SELECT sanctioned_cost INTO v_work_budget FROM works WHERE id = NEW.work_id;
  SELECT IFNULL(SUM(base_cost), 0) INTO v_utilized
    FROM payments WHERE work_id = NEW.work_id AND status <> 'CANCELLED';

  IF (v_utilized + NEW.base_cost) > v_work_budget THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invoice base cost exceeds remaining work order budget.';
  END IF;

  SET NEW.cumulative_gross_amount_till_date = v_utilized + NEW.base_cost;
END$$

CREATE TRIGGER trg_payments_before_update_budget_check
BEFORE UPDATE ON payments
FOR EACH ROW
BEGIN
  DECLARE v_work_budget DECIMAL(15,2);
  DECLARE v_utilized DECIMAL(15,2);

  IF NEW.base_cost <> OLD.base_cost OR NEW.status <> OLD.status THEN
    SELECT sanctioned_cost INTO v_work_budget FROM works WHERE id = NEW.work_id;
    SELECT IFNULL(SUM(base_cost), 0) INTO v_utilized
      FROM payments WHERE work_id = NEW.work_id AND status <> 'CANCELLED' AND id <> NEW.id;

    IF NEW.status <> 'CANCELLED' AND (v_utilized + NEW.base_cost) > v_work_budget THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invoice base cost exceeds remaining work order budget.';
    END IF;

    SET NEW.cumulative_gross_amount_till_date = v_utilized + IF(NEW.status = 'CANCELLED', 0, NEW.base_cost);
  END IF;
END$$

DELIMITER ;

-- ============================================================================
-- SECTION 9: REPORTING VIEWS (Live Budget Meter data source)
-- ============================================================================

CREATE VIEW v_scheme_budget_summary AS
SELECT
  s.id AS scheme_id,
  s.department_id,
  s.scheme_name,
  s.financial_year,
  s.sanctioned_budget,
  IFNULL(SUM(w.sanctioned_cost), 0) AS allocated_to_works,
  s.sanctioned_budget - IFNULL(SUM(w.sanctioned_cost), 0) AS remaining_scheme_budget
FROM schemes s
LEFT JOIN works w ON w.scheme_id = s.id AND w.status <> 'TERMINATED'
GROUP BY s.id, s.department_id, s.scheme_name, s.financial_year, s.sanctioned_budget;

CREATE VIEW v_work_budget_summary AS
SELECT
  w.id AS work_id,
  w.department_id,
  w.scheme_id,
  w.work_name,
  w.sanctioned_cost,
  IFNULL(SUM(p.base_cost), 0) AS utilized_amount,
  w.sanctioned_cost - IFNULL(SUM(p.base_cost), 0) AS remaining_balance
FROM works w
LEFT JOIN payments p ON p.work_id = w.id AND p.status <> 'CANCELLED'
GROUP BY w.id, w.department_id, w.scheme_id, w.work_name, w.sanctioned_cost;

-- ============================================================================
-- SECTION 10: SEED DATA
-- ============================================================================

INSERT INTO gst_state_codes (state_code, state_name) VALUES
('01','Jammu and Kashmir'),('02','Himachal Pradesh'),('03','Punjab'),('04','Chandigarh'),
('05','Uttarakhand'),('06','Haryana'),('07','Delhi'),('08','Rajasthan'),
('09','Uttar Pradesh'),('10','Bihar'),('11','Sikkim'),('12','Arunachal Pradesh'),
('13','Nagaland'),('14','Manipur'),('15','Mizoram'),('16','Tripura'),
('17','Meghalaya'),('18','Assam'),('19','West Bengal'),('20','Jharkhand'),
('21','Odisha'),('22','Chhattisgarh'),('23','Madhya Pradesh'),('24','Gujarat'),
('25','Daman and Diu'),('26','Dadra and Nagar Haveli'),('27','Maharashtra'),
('28','Andhra Pradesh (Old)'),('29','Karnataka'),('30','Goa'),('31','Lakshadweep'),
('32','Kerala'),('33','Tamil Nadu'),('34','Puducherry'),('35','Andaman and Nicobar Islands'),
('36','Telangana'),('37','Andhra Pradesh (New)'),('38','Ladakh');

INSERT INTO roles (role_code, role_name, description) VALUES
('SUPER_ADMIN', 'Super Admin', 'Software company - onboards departments, manages subscriptions'),
('DEPARTMENT_ADMIN', 'Department Admin', 'Head of department office - sets up profile, DDO, staff, budgets'),
('EXECUTIVE_ENGINEER', 'Executive Engineer / Approver', 'Verifies bills and issues official certificates'),
('DATA_ENTRY_OPERATOR', 'Data Entry Operator', 'Enters contractor, work order, and invoice data'),
('AUDITOR', 'Auditor / Viewer', 'Read-only access to financial records and tax summaries');

INSERT INTO modules (module_code, module_name, description) VALUES
('DASHBOARD', 'Dashboard', 'Overview and summary widgets'),
('CONTRACTOR_MASTER', 'Contractor Master', 'Manage contractor directory'),
('SCHEME_MASTER', 'Scheme Master', 'Manage work schemes and budgets'),
('WORK_MASTER', 'Work Master', 'Manage work orders/agreements'),
('PAYMENT_ENTRY', 'Payment Entry', 'Three-part payment entry workflow'),
('PAYMENT_CERTIFICATE', 'Payment Certificates', 'Generate RA bill / payment certificates'),
('WORK_EXPERIENCE_CERTIFICATE', 'Work Experience Certificates', 'Generate contractor completion certificates'),
('TAX_LEDGER_REPORT', 'Tax & Audit Reports', 'Consolidated tax/audit summary reports'),
('AUDIT_LOGS', 'Audit Logs', 'View system-wide change history'),
('USER_MANAGEMENT', 'User Management', 'Manage staff accounts and permissions'),
('DEPARTMENT_SETTINGS', 'Department Settings', 'Department profile and DDO configuration');

-- ============================================================================
-- NOTES FOR THE APPLICATION LAYER
-- ============================================================================
-- 1. Every tenant-scoped query MUST filter by department_id from the
--    authenticated session - the schema does not enforce cross-department
--    isolation on its own (shared-schema multi-tenancy).
-- 2. audit_logs rows are written by the app (not DB triggers) because only
--    the app knows the request's IP address, user agent, and the reason
--    text for deletes. Wrap each write (payments/works/schemes/contractors/
--    users) + its audit_logs insert in one transaction.
-- 3. "Others" dropdown options (GST rate, IT TDS, GST TDS, Cess, Royalty,
--    Stamp Duty, Other Deductions): store the resolved numeric rate/amount
--    in the normal rate/value column regardless of whether it came from a
--    preset or manual entry; the *_is_manual flags (or *_type for
--    royalty/stamp/other) exist purely so certificates/reports can note
--    when a non-standard rate was applied.
-- 4. gst_tds_type should be derived by the app by comparing
--    departments.state_code to contractors.gst_state_code at the moment
--    Part 1 of the payment form is completed (intra vs inter-state).
-- ============================================================================
