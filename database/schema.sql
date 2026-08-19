-- ============================================================================
-- Multi-Tenant Government Contract & Payment Management System
-- PostgreSQL 15+ DDL (Neon-hosted)
--
-- Multi-tenancy model : SHARED SCHEMA, department_id on every tenant-scoped
--                        table. Row-level isolation must be enforced in the
--                        application layer (every query scoped by the
--                        logged-in user's department_id).
--
-- Ported from MySQL (see git history for the original). Two structural
-- differences from the MySQL version, both because Postgres is stricter:
--   1. Postgres generated columns cannot reference another generated
--      column. `gst_amount`, `it_tds_amount`, `cgst/sgst/igst_tds_amount`,
--      `labour_cess_amount`, `royalty_amount`, `stamp_duty_amount`, and
--      `other_deduction_amount` stay DB-generated (they only reference
--      plain columns). `total_bill_value`, `total_deductions`, and
--      `net_payable_amount` are now plain columns that the application
--      sets on every write via src/lib/payment-calc.ts's calculatePayment()
--      (already independently verified byte-for-byte against the DB math).
--   2. Postgres has no `ON UPDATE CURRENT_TIMESTAMP` column option - every
--      table with `updated_at` gets a BEFORE UPDATE trigger instead
--      (see set_updated_at() in Section 8).
-- ============================================================================

-- ============================================================================
-- SECTION 0: ENUM TYPES
-- ============================================================================

CREATE TYPE departments_status AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE ddo_details_status AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE users_status AS ENUM ('ACTIVE','INACTIVE','SUSPENDED');
CREATE TYPE contractors_status AS ENUM ('ACTIVE','INACTIVE','BLACKLISTED');
CREATE TYPE schemes_status AS ENUM ('ACTIVE','CLOSED');
CREATE TYPE works_status AS ENUM ('ONGOING','COMPLETED','TERMINATED');
CREATE TYPE payments_gst_tds_type AS ENUM ('INTRA_STATE','INTER_STATE','NOT_APPLICABLE');
CREATE TYPE payments_royalty_type AS ENUM ('PERCENTAGE','FIXED_AMOUNT','NOT_APPLICABLE');
CREATE TYPE payments_stamp_duty_type AS ENUM ('PERCENTAGE','FIXED_AMOUNT','NOT_APPLICABLE');
CREATE TYPE payments_other_deduction_type AS ENUM ('PERCENTAGE','FIXED_AMOUNT','NOT_APPLICABLE');
CREATE TYPE payments_status AS ENUM ('SAVED','APPROVED','CANCELLED');
CREATE TYPE pay_mode_type AS ENUM ('TREASURY','OTHER_THAN_TREASURY');  -- shared by payments and salary_payments
CREATE TYPE salary_payments_payment_type AS ENUM ('SALARY','DA','ARREAR','MEDICAL_REIMBURSEMENT','OTHER','SALARY_ARREAR','DA_ARREAR');
CREATE TYPE certificate_logs_certificate_type AS ENUM ('PAYMENT_CERTIFICATE','WORK_EXPERIENCE_CERTIFICATE','TAX_LEDGER_REPORT');
CREATE TYPE certificate_logs_file_format AS ENUM ('PDF','EXCEL','CSV');
CREATE TYPE audit_logs_action AS ENUM ('CREATE','UPDATE','DELETE');
CREATE TYPE login_logs_status AS ENUM ('SUCCESS','FAILED');

-- ============================================================================
-- SECTION 1: LOOKUP / REFERENCE TABLES
-- ============================================================================

CREATE TABLE gst_state_codes (
  state_code   CHAR(2)      NOT NULL PRIMARY KEY,
  state_name   VARCHAR(100) NOT NULL
);

CREATE TABLE roles (
  id             SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_code      VARCHAR(30)  NOT NULL UNIQUE,   -- SUPER_ADMIN, DEPARTMENT_ADMIN, EXECUTIVE_ENGINEER, DATA_ENTRY_OPERATOR, AUDITOR
  role_name      VARCHAR(60)  NOT NULL,
  description    VARCHAR(255) NULL,
  is_system_role BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE modules (
  id           SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  module_code  VARCHAR(50)  NOT NULL UNIQUE,   -- CONTRACTOR_MASTER, SCHEME_MASTER, WORK_MASTER, PAYMENT_ENTRY, ...
  module_name  VARCHAR(100) NOT NULL,
  description  VARCHAR(255) NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 2: TENANT (DEPARTMENT) & IDENTITY
-- ============================================================================

CREATE TABLE departments (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_code         VARCHAR(20)  NOT NULL UNIQUE,        -- e.g. 'PWD-KA', used in URLs/subdomains
  department_name     VARCHAR(150) NOT NULL,
  office_address      VARCHAR(255) NULL,
  district            VARCHAR(100) NULL,
  state               VARCHAR(100) NULL,
  gstin               CHAR(15)     NULL UNIQUE,
  state_code          CHAR(2) GENERATED ALWAYS AS (LEFT(gstin, 2)) STORED,  -- derived from GSTIN, same pattern as contractors.gst_state_code - avoids the state/state_code/gstin drifting out of sync
  gstin_registration_date DATE NULL,   -- invoice_date on payments must be >= this (see trg_payments_before_*_date_check)
  pan                 CHAR(10)     NULL UNIQUE,
  tan                 VARCHAR(10)  NULL,
  official_email      VARCHAR(150) NULL UNIQUE,   -- also the login email for the auto-created Department Admin account (Super Admin onboarding)
  contact_number      VARCHAR(20)  NULL,
  logo_path           VARCHAR(255) NULL,
  status              departments_status NOT NULL DEFAULT 'ACTIVE',   -- Super Admin's Disable/Enable toggle
  allow_future_payment_dates BOOLEAN NOT NULL DEFAULT FALSE,   -- Super-Admin-only override; see trg_payments_before_*_date_check
  subscription_amount     DECIMAL(12,2) NULL,
  subscription_start_date DATE NULL,
  subscription_days       INTEGER NULL,
  subscription_end_date   DATE GENERATED ALWAYS AS (subscription_start_date + subscription_days) STORED,
  created_by          BIGINT NULL,                -- FK to users.id, added after users table exists (circular ref)
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dept_state_code FOREIGN KEY (state_code) REFERENCES gst_state_codes(state_code),
  CONSTRAINT chk_departments_subscription_days CHECK (subscription_days IS NULL OR subscription_days > 0),
  CONSTRAINT chk_departments_subscription_amount CHECK (subscription_amount IS NULL OR subscription_amount >= 0)
);

CREATE TABLE ddo_details (
  id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id               BIGINT NOT NULL,
  ddo_name                    VARCHAR(150) NOT NULL,
  designation                 VARCHAR(150) NOT NULL,       -- e.g. 'Executive Engineer'
  ddo_code                    VARCHAR(50)  NULL,
  treasury_registration_code  VARCHAR(50)  NULL,
  is_primary                  BOOLEAN NOT NULL DEFAULT TRUE,
  status                      ddo_details_status NOT NULL DEFAULT 'ACTIVE',
  created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ddo_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);
CREATE INDEX idx_ddo_department ON ddo_details (department_id);

CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id BIGINT NULL,           -- NULL = Super Admin (software company staff)
  role_id       SMALLINT NOT NULL,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  phone         VARCHAR(20)  NULL,
  password_hash VARCHAR(255) NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,  -- set TRUE whenever an admin resets a password to the default
  -- Self-service "Forgot Password": a random temp password, valid alongside
  -- (not instead of) password_hash until it expires or is actually used to
  -- set a new password - see src/lib/password-reset.ts.
  reset_password_hash       VARCHAR(255) NULL,
  reset_password_expires_at TIMESTAMP    NULL,
  status        users_status NOT NULL DEFAULT 'ACTIVE',
  last_login_at TIMESTAMP NULL,
  last_logout_at TIMESTAMP NULL,
  created_by    BIGINT NULL,           -- self-reference: which user created this account
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_users_role       FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_users_department ON users (department_id);

-- deferred FK now that users exists (breaks the departments <-> users circular dependency)
ALTER TABLE departments
  ADD CONSTRAINT fk_departments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- SECTION 3: RBAC - SUBSCRIPTION (SUPER ADMIN) & USER PERMISSIONS (DEPT ADMIN)
-- ============================================================================

CREATE TABLE department_modules (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id BIGINT NOT NULL,
  module_id     SMALLINT NOT NULL,
  is_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  enabled_by    BIGINT NULL,
  enabled_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deptmod_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_deptmod_module     FOREIGN KEY (module_id) REFERENCES modules(id),
  CONSTRAINT fk_deptmod_enabled_by FOREIGN KEY (enabled_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_department_module UNIQUE (department_id, module_id)
);

CREATE TABLE user_module_permissions (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL,
  module_id  SMALLINT NOT NULL,
  can_view   BOOLEAN NOT NULL DEFAULT FALSE,
  can_create BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit   BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_userperm_user   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_userperm_module FOREIGN KEY (module_id) REFERENCES modules(id),
  CONSTRAINT uq_user_module UNIQUE (user_id, module_id)
);

-- ============================================================================
-- SECTION 4: MASTER DATA - CONTRACTORS, SCHEMES, WORKS
-- ============================================================================

CREATE TABLE contractors (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id       BIGINT NOT NULL,
  firm_name           VARCHAR(150) NOT NULL,
  vendor_code         VARCHAR(30)  NULL,
  pan_number          CHAR(10)     NOT NULL,
  gstin               CHAR(15)     NULL,
  gst_state_code      CHAR(2) GENERATED ALWAYS AS (LEFT(gstin, 2)) STORED,  -- derived, used for intra/inter-state GST TDS split
  address             VARCHAR(255) NULL,   -- street-line only; district/state/pin_code are separate columns below
  district            VARCHAR(100) NULL,
  state               VARCHAR(100) NULL,
  pin_code            VARCHAR(10)  NULL,
  contact_person      VARCHAR(150) NULL,
  phone               VARCHAR(20)  NULL,
  email               VARCHAR(150) NULL,
  bank_name           VARCHAR(150) NULL,
  bank_branch         VARCHAR(150) NULL,
  account_number      VARCHAR(30)  NULL,
  ifsc_code           VARCHAR(11)  NULL,
  account_holder_name VARCHAR(150) NULL,
  status              contractors_status NOT NULL DEFAULT 'ACTIVE',
  created_by          BIGINT NULL,
  updated_by          BIGINT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contractor_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_contractor_gst_state  FOREIGN KEY (gst_state_code) REFERENCES gst_state_codes(state_code),
  CONSTRAINT fk_contractor_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_contractor_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_contractor_pan_per_dept UNIQUE (department_id, pan_number),
  CONSTRAINT uq_contractor_vendor_code UNIQUE (department_id, vendor_code)
);
CREATE INDEX idx_contractor_department ON contractors (department_id);
CREATE INDEX idx_contractor_gstin ON contractors (gstin);

CREATE TABLE schemes (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id     BIGINT NOT NULL,
  scheme_name       VARCHAR(200) NOT NULL,
  financial_year    VARCHAR(9)   NOT NULL,      -- e.g. '2025-2026'
  sanctioned_budget DECIMAL(15,2) NOT NULL,
  description       VARCHAR(500) NULL,
  status            schemes_status NOT NULL DEFAULT 'ACTIVE',
  created_by        BIGINT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_scheme_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_scheme_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_scheme_budget CHECK (sanctioned_budget > 0),
  CONSTRAINT uq_scheme_name_per_year UNIQUE (department_id, scheme_name, financial_year)
);
CREATE INDEX idx_scheme_department ON schemes (department_id);

-- Contractor and agreement/contract details are deliberately NOT captured
-- here. A work order is just "what work, under which scheme, for how much
-- budget" - the contractor assignment and agreement number/date are entered
-- per-payment in the Payment Entry form (see payments.contractor_id and
-- payments.agreement_number_snapshot / agreement_date_snapshot below).
CREATE TABLE works (
  id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id             BIGINT NOT NULL,
  scheme_id                 BIGINT NOT NULL,
  work_name                 VARCHAR(200) NOT NULL,
  sanctioned_cost           DECIMAL(15,2) NOT NULL,
  expected_completion_date  DATE NULL,
  actual_completion_date    DATE NULL,
  status                    works_status NOT NULL DEFAULT 'ONGOING',
  created_by                BIGINT NULL,
  created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_work_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_work_scheme     FOREIGN KEY (scheme_id) REFERENCES schemes(id),
  CONSTRAINT fk_work_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_work_cost CHECK (sanctioned_cost > 0)
);
CREATE INDEX idx_work_department ON works (department_id);
CREATE INDEX idx_work_scheme ON works (scheme_id);

-- ============================================================================
-- SECTION 5: PAYMENT ENTRY (CORE TRANSACTION)
-- ============================================================================

CREATE TABLE payments (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id         BIGINT NOT NULL,
  work_id               BIGINT NOT NULL,
  contractor_id         BIGINT NOT NULL,

  -- snapshots: certificates/reports must reflect facts as they were at the
  -- moment of payment, even if the contractor/work master is edited later
  contractor_name_snapshot  VARCHAR(150) NOT NULL,
  contractor_gstin_snapshot CHAR(15) NULL,
  contractor_pan_snapshot   CHAR(10) NULL,
  work_name_snapshot         VARCHAR(200) NOT NULL,
  agreement_number_snapshot  VARCHAR(50) NOT NULL,
  agreement_date_snapshot    DATE NOT NULL,

  -- Part 2: invoice & base cost
  invoice_number   VARCHAR(50) NOT NULL,
  invoice_date     DATE NOT NULL,
  -- Indian financial year (Apr-Mar) start year derived from invoice_date, used
  -- only to scope uq_payment_contractor_fy_invoice below - a contractor's
  -- invoice number must be unique within one FY, not globally.
  invoice_fy_start_year SMALLINT GENERATED ALWAYS AS (
    CASE WHEN EXTRACT(MONTH FROM invoice_date) >= 4
         THEN EXTRACT(YEAR FROM invoice_date) ELSE EXTRACT(YEAR FROM invoice_date) - 1 END
  ) STORED,
  base_cost        DECIMAL(15,2) NOT NULL,                              -- (A)

  -- GST payable
  gst_rate            DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_rate_is_manual  BOOLEAN NOT NULL DEFAULT FALSE,
  gst_amount          DECIMAL(15,2) GENERATED ALWAYS AS (ROUND(base_cost * gst_rate / 100, 2)) STORED,   -- (B)
  -- (C) Total Bill Value = base_cost + gst_amount - plain column, app-set (see header note)
  total_bill_value    DECIMAL(15,2) NOT NULL,

  -- Income Tax TDS
  it_tds_rate           DECIMAL(5,2) NOT NULL DEFAULT 0,
  it_tds_rate_is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  it_tds_amount         DECIMAL(15,2) GENERATED ALWAYS AS (ROUND(base_cost * it_tds_rate / 100, 2)) STORED,

  -- GST TDS (intra-state splits into CGST+SGST, inter-state goes wholly to IGST)
  gst_tds_rate           DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_tds_rate_is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  gst_tds_type           payments_gst_tds_type NOT NULL DEFAULT 'NOT_APPLICABLE',
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
  labour_cess_rate_is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  labour_cess_amount         DECIMAL(15,2) GENERATED ALWAYS AS (ROUND(base_cost * labour_cess_rate / 100, 2)) STORED,

  -- Royalty (either a flat rupee amount or a % of base cost)
  royalty_type   payments_royalty_type NOT NULL DEFAULT 'NOT_APPLICABLE',
  royalty_value  DECIMAL(15,2) NOT NULL DEFAULT 0,
  royalty_amount DECIMAL(15,2) GENERATED ALWAYS AS (
                    CASE royalty_type
                      WHEN 'PERCENTAGE'    THEN ROUND(base_cost * royalty_value / 100, 2)
                      WHEN 'FIXED_AMOUNT'  THEN royalty_value
                      ELSE 0
                    END
                  ) STORED,

  -- Stamp Duty / Retention
  stamp_duty_type   payments_stamp_duty_type NOT NULL DEFAULT 'NOT_APPLICABLE',
  stamp_duty_value  DECIMAL(15,2) NOT NULL DEFAULT 0,
  stamp_duty_amount DECIMAL(15,2) GENERATED ALWAYS AS (
                       CASE stamp_duty_type
                         WHEN 'PERCENTAGE'   THEN ROUND(base_cost * stamp_duty_value / 100, 2)
                         WHEN 'FIXED_AMOUNT' THEN stamp_duty_value
                         ELSE 0
                       END
                     ) STORED,

  -- Other deductions
  other_deduction_type    payments_other_deduction_type NOT NULL DEFAULT 'NOT_APPLICABLE',
  other_deduction_value   DECIMAL(15,2) NOT NULL DEFAULT 0,
  other_deduction_amount  DECIMAL(15,2) GENERATED ALWAYS AS (
                             CASE other_deduction_type
                               WHEN 'PERCENTAGE'   THEN ROUND(base_cost * other_deduction_value / 100, 2)
                               WHEN 'FIXED_AMOUNT' THEN other_deduction_value
                               ELSE 0
                             END
                           ) STORED,
  other_deduction_remarks VARCHAR(255) NULL,

  -- Totals - plain columns, app-set (see header note): Postgres generated
  -- columns cannot reference other generated columns, so these are computed
  -- by src/lib/payment-calc.ts and written directly on every insert/update.
  total_deductions   DECIMAL(15,2) NOT NULL,                                                              -- (D)
  net_payable_amount DECIMAL(15,2) NOT NULL,                                                               -- (E)

  -- maintained by trigger (see Section 8) for "cumulative work done till date" on RA bills
  cumulative_gross_amount_till_date DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Part 3: treasury reference
  -- pay_mode drives which of the two date fields is authoritative:
  -- TREASURY: token_generated_date is captured at entry time; actual_payment_date
  --   is filled in later (see the Treasury Reconciliation screen) once the
  --   monthly reconciliation statement confirms the treasury's real payment date.
  -- OTHER_THAN_TREASURY: actual_payment_date is entered directly at entry time -
  --   there is no token/reconciliation step for this mode.
  pay_mode              pay_mode_type NOT NULL DEFAULT 'TREASURY',
  treasury_token_number VARCHAR(50) NULL,
  token_generated_date  DATE NULL,
  actual_payment_date   DATE NULL,
  -- the "real" date to report against - resolves to the reconciled date once
  -- known, falling back to the token date until then. Every report/PDF/export
  -- reads this column unchanged; only entry/import/reconciliation write to the
  -- two plain columns above.
  treasury_payment_date DATE GENERATED ALWAYS AS (COALESCE(actual_payment_date, token_generated_date)) STORED,
  -- true exactly when treasury_payment_date is still a guess (token date, not
  -- yet reconciled) - surfaced as a caveat badge in reports/certificates.
  payment_date_is_estimated BOOLEAN GENERATED ALWAYS AS (
    pay_mode = 'TREASURY' AND actual_payment_date IS NULL AND token_generated_date IS NOT NULL
  ) STORED,
  remarks                VARCHAR(500) NULL,

  status              payments_status NOT NULL DEFAULT 'SAVED',
  cancellation_reason VARCHAR(500) NULL,                    -- mandatory (enforced in app) when status = CANCELLED

  created_by  BIGINT NULL,
  approved_by BIGINT NULL,
  approved_at TIMESTAMP NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

  -- Date hierarchy: agreement -> invoice -> token generated -> actual payment.
  -- Enforced here (not just in the app) so no entry path - manual, CSV
  -- import, or future code - can persist an out-of-order date.
  CONSTRAINT chk_payment_invoice_after_agreement CHECK (invoice_date >= agreement_date_snapshot),
  CONSTRAINT chk_payment_token_after_invoice CHECK (token_generated_date IS NULL OR token_generated_date >= invoice_date),
  CONSTRAINT chk_payment_actual_after_invoice CHECK (actual_payment_date IS NULL OR actual_payment_date >= invoice_date),
  CONSTRAINT chk_payment_actual_after_token CHECK (actual_payment_date IS NULL OR token_generated_date IS NULL OR actual_payment_date >= token_generated_date),

  -- Invoice number format: max 16 chars, letters/digits/hyphen/slash only.
  CONSTRAINT chk_payment_invoice_number_format CHECK (invoice_number ~ '^[A-Za-z0-9\-/]{1,16}$'),

  CONSTRAINT uq_payment_work_invoice UNIQUE (work_id, invoice_number),
  -- A contractor cannot reuse the same invoice number within one financial year.
  CONSTRAINT uq_payment_contractor_fy_invoice UNIQUE (contractor_id, invoice_fy_start_year, invoice_number)
);
CREATE INDEX idx_payment_department ON payments (department_id);
CREATE INDEX idx_payment_work ON payments (work_id);
CREATE INDEX idx_payment_contractor ON payments (contractor_id);
CREATE INDEX idx_payment_status ON payments (status);
CREATE INDEX idx_payment_treasury_token ON payments (treasury_token_number);

-- ============================================================================
-- SECTION 5B: PAYROLL - EMPLOYEES & SALARY PAYMENTS
-- Independent of the contractor/work/scheme budget model above - salary
-- payments have no work-order/scheme budget ceiling to guard against.
-- ============================================================================

CREATE TABLE employees (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id   BIGINT NOT NULL,
  employee_name   VARCHAR(150) NOT NULL,
  pan_number      CHAR(10) NOT NULL,
  email           VARCHAR(150) NULL,
  designation     VARCHAR(100) NULL,
  employee_code   VARCHAR(30) NULL,     -- human-readable employee ID, distinct from the internal bigint PK
  dob             DATE NULL,
  mobile          VARCHAR(20) NULL,
  joining_date    DATE NULL,      -- joining this department
  transfer_date   DATE NULL,      -- transfer out of this department, if applicable
  status          ddo_details_status NOT NULL DEFAULT 'ACTIVE',   -- reuses the existing ACTIVE/INACTIVE enum
  created_by      BIGINT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_employee_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_employee_pan_per_dept UNIQUE (department_id, pan_number),
  CONSTRAINT uq_employee_code_per_dept UNIQUE (department_id, employee_code)
);
CREATE INDEX idx_employee_department ON employees (department_id);

CREATE TABLE salary_payments (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id           BIGINT NOT NULL,
  employee_id             BIGINT NOT NULL,
  employee_name_snapshot  VARCHAR(150) NOT NULL,
  employee_pan_snapshot   CHAR(10) NULL,
  payment_type            salary_payments_payment_type NOT NULL DEFAULT 'SALARY',
  other_type_label        VARCHAR(100) NULL,               -- only used when payment_type = OTHER
  -- which month's salary/payroll this entry is for (independent of when the
  -- treasury actually pays it) - lets preparers and Super Admin see at a
  -- glance which period a given entry covers.
  payment_period_month    SMALLINT NOT NULL,
  payment_period_year     SMALLINT NOT NULL,
  gross_salary            DECIMAL(15,2) NOT NULL,
  it_deduction_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_payable_amount      DECIMAL(15,2) GENERATED ALWAYS AS (gross_salary - it_deduction_amount) STORED,
  -- see the matching comment on payments.pay_mode above - same semantics here
  pay_mode                pay_mode_type NOT NULL DEFAULT 'TREASURY',
  treasury_token_number   VARCHAR(50) NULL,
  token_generated_date    DATE NULL,
  actual_payment_date     DATE NULL,
  treasury_payment_date   DATE GENERATED ALWAYS AS (COALESCE(actual_payment_date, token_generated_date)) STORED,  -- basis for the Form 24Q quarterly report
  payment_date_is_estimated BOOLEAN GENERATED ALWAYS AS (
    pay_mode = 'TREASURY' AND actual_payment_date IS NULL AND token_generated_date IS NOT NULL
  ) STORED,
  status                  payments_status NOT NULL DEFAULT 'SAVED',   -- reuses the non-salary payments status enum
  cancellation_reason     VARCHAR(500) NULL,
  remarks                 VARCHAR(500) NULL,
  created_by              BIGINT NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_salpay_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_salpay_employee   FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_salpay_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_salpay_gross_salary CHECK (gross_salary > 0),
  CONSTRAINT chk_salpay_it_deduction CHECK (it_deduction_amount >= 0),
  CONSTRAINT chk_salpay_actual_after_token CHECK (actual_payment_date IS NULL OR token_generated_date IS NULL OR actual_payment_date >= token_generated_date),
  CONSTRAINT chk_salpay_period_month CHECK (payment_period_month BETWEEN 1 AND 12),
  CONSTRAINT chk_salpay_period_year CHECK (payment_period_year BETWEEN 2000 AND 2100)
);
CREATE INDEX idx_salpay_department ON salary_payments (department_id);
CREATE INDEX idx_salpay_employee ON salary_payments (employee_id);
CREATE INDEX idx_salpay_status ON salary_payments (status);
CREATE INDEX idx_salpay_treasury_token ON salary_payments (treasury_token_number);

-- ============================================================================
-- SECTION 6: CERTIFICATES & REPORT GENERATION LOG
-- ============================================================================

CREATE TABLE work_experience_certificates (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id            BIGINT NOT NULL,
  work_id                  BIGINT NOT NULL,
  contractor_id             BIGINT NOT NULL,
  certificate_number        VARCHAR(50) NOT NULL,
  stated_completion_date    DATE NULL,
  actual_completion_date    DATE NULL,
  sanctioned_value          DECIMAL(15,2) NOT NULL,
  executed_value            DECIMAL(15,2) NOT NULL,
  performance_rating_label  VARCHAR(50) NULL,     -- e.g. 'EXCELLENT','GOOD','SATISFACTORY','POOR'
  performance_rating_score  DECIMAL(3,1) NULL,    -- optional numeric score, e.g. out of 10
  remarks                   VARCHAR(500) NULL,
  issued_by                 BIGINT NOT NULL,
  issued_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wec_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_wec_work       FOREIGN KEY (work_id) REFERENCES works(id),
  CONSTRAINT fk_wec_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id),
  CONSTRAINT fk_wec_issued_by  FOREIGN KEY (issued_by) REFERENCES users(id),
  CONSTRAINT uq_wec_certificate_number UNIQUE (department_id, certificate_number)
);
CREATE INDEX idx_wec_work ON work_experience_certificates (work_id);

CREATE TABLE certificate_logs (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id     BIGINT NOT NULL,
  certificate_type  certificate_logs_certificate_type NOT NULL,
  reference_table    VARCHAR(50) NOT NULL,        -- e.g. 'payments', 'works'
  reference_id       BIGINT NOT NULL,
  file_format         certificate_logs_file_format NOT NULL DEFAULT 'PDF',
  generated_by         BIGINT NOT NULL,
  generated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes                 VARCHAR(255) NULL,
  CONSTRAINT fk_certlog_department  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_certlog_generated_by FOREIGN KEY (generated_by) REFERENCES users(id)
);
CREATE INDEX idx_certlog_reference ON certificate_logs (reference_table, reference_id);
CREATE INDEX idx_certlog_department ON certificate_logs (department_id);

CREATE TABLE smtp_settings (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id        BIGINT NULL,        -- NULL = Super Admin's own SMTP settings (software company level)
  smtp_host            VARCHAR(255) NOT NULL,
  smtp_port            INTEGER NOT NULL DEFAULT 587,
  smtp_username        VARCHAR(255) NOT NULL,
  smtp_password_cipher TEXT NOT NULL,       -- AES-256-GCM ciphertext, base64 (iv:authTag:ciphertext), see src/lib/crypto.ts
  smtp_from_email      VARCHAR(150) NOT NULL,
  smtp_from_name       VARCHAR(150) NULL,
  use_tls              BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by           BIGINT NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_smtp_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_smtp_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_smtp_department UNIQUE (department_id)
);
-- Plain UNIQUE(department_id) above doesn't stop multiple Super-Admin rows
-- (Postgres treats distinct NULLs as non-duplicate) - this partial index
-- enforces at most one department_id IS NULL row (a singleton).
CREATE UNIQUE INDEX uq_smtp_superadmin_singleton ON smtp_settings ((true)) WHERE department_id IS NULL;

CREATE TRIGGER trg_smtp_settings_updated_at BEFORE UPDATE ON smtp_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- SECTION 7: AUDIT TRAIL & SECURITY LOGS
-- Written by the application layer (it has access to IP/user-agent/reason,
-- which a pure DB trigger cannot see). See note at bottom of file.
-- ============================================================================

CREATE TABLE audit_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id BIGINT NULL,             -- NULL for Super-Admin-level actions
  performed_by  BIGINT NULL,
  table_name    VARCHAR(50) NOT NULL,
  record_id     BIGINT NOT NULL,
  action        audit_logs_action NOT NULL,
  old_data      JSONB NULL,
  new_data      JSONB NULL,
  reason        VARCHAR(500) NULL,                -- mandatory for DELETE, enforced in app layer
  ip_address    VARCHAR(45) NULL,
  user_agent    VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_user       FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_audit_table_record ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_department ON audit_logs (department_id);
CREATE INDEX idx_audit_created_at ON audit_logs (created_at);

CREATE TABLE login_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       BIGINT NOT NULL,
  department_id BIGINT NULL,
  login_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_at     TIMESTAMP NULL,
  ip_address    VARCHAR(45) NULL,
  user_agent    VARCHAR(255) NULL,
  status        login_logs_status NOT NULL,
  CONSTRAINT fk_loginlog_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_loginlog_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);
CREATE INDEX idx_loginlog_user ON login_logs (user_id);
CREATE INDEX idx_loginlog_login_at ON login_logs (login_at);

-- ============================================================================
-- SECTION 7B: NOTICES (Super-Admin-authored announcements shown to department
-- users, e.g. TDS/GSTR-7 filing deadline reminders). department_id NULL means
-- broadcast to every department.
-- ============================================================================

CREATE TABLE notices (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  message       VARCHAR(1000) NOT NULL,
  department_id BIGINT NULL,
  starts_at     DATE NULL,
  expires_at    DATE NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    BIGINT NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notice_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_notice_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_notice_dates CHECK (starts_at IS NULL OR expires_at IS NULL OR expires_at >= starts_at)
);
CREATE INDEX idx_notice_department ON notices (department_id);
CREATE INDEX idx_notice_active ON notices (is_active);

-- ============================================================================
-- SECTION 8: TRIGGERS
--   a) set_updated_at() - Postgres has no `ON UPDATE CURRENT_TIMESTAMP`
--      column option, so every table with `updated_at` gets this trigger.
--   b) Budget guardrail triggers (defense in depth). The UI's "Live Budget
--      Meter" gives instant feedback, but these are the authoritative,
--      unbypassable enforcement of:
--        Sanctioned Work Amount <= Remaining Scheme Budget
--        Current Invoice Base Cost <= Remaining Work Balance
--      They also maintain payments.cumulative_gross_amount_till_date.
-- ============================================================================

CREATE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ddo_details_updated_at BEFORE UPDATE ON ddo_details FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contractors_updated_at BEFORE UPDATE ON contractors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_schemes_updated_at BEFORE UPDATE ON schemes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_works_updated_at BEFORE UPDATE ON works FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_salary_payments_updated_at BEFORE UPDATE ON salary_payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_notices_updated_at BEFORE UPDATE ON notices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE FUNCTION trg_works_before_insert_budget_check() RETURNS TRIGGER AS $$
DECLARE
  v_scheme_budget DECIMAL(15,2);
  v_allocated DECIMAL(15,2);
BEGIN
  SELECT sanctioned_budget INTO v_scheme_budget FROM schemes WHERE id = NEW.scheme_id;
  SELECT COALESCE(SUM(sanctioned_cost), 0) INTO v_allocated
    FROM works WHERE scheme_id = NEW.scheme_id AND status <> 'TERMINATED';

  IF (v_allocated + NEW.sanctioned_cost) > v_scheme_budget THEN
    RAISE EXCEPTION 'Sanctioned work cost exceeds remaining scheme budget.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_works_before_insert_budget_check
BEFORE INSERT ON works
FOR EACH ROW EXECUTE FUNCTION trg_works_before_insert_budget_check();

CREATE FUNCTION trg_works_before_update_budget_check() RETURNS TRIGGER AS $$
DECLARE
  v_scheme_budget DECIMAL(15,2);
  v_allocated DECIMAL(15,2);
BEGIN
  IF NEW.sanctioned_cost <> OLD.sanctioned_cost OR NEW.scheme_id <> OLD.scheme_id THEN
    SELECT sanctioned_budget INTO v_scheme_budget FROM schemes WHERE id = NEW.scheme_id;
    SELECT COALESCE(SUM(sanctioned_cost), 0) INTO v_allocated
      FROM works WHERE scheme_id = NEW.scheme_id AND status <> 'TERMINATED' AND id <> NEW.id;

    IF (v_allocated + NEW.sanctioned_cost) > v_scheme_budget THEN
      RAISE EXCEPTION 'Sanctioned work cost exceeds remaining scheme budget.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_works_before_update_budget_check
BEFORE UPDATE ON works
FOR EACH ROW EXECUTE FUNCTION trg_works_before_update_budget_check();

-- Budget ceiling is GST-inclusive: total_bill_value (base cost + GST), not
-- just base cost, is what's checked against and accumulated against the
-- work's sanctioned_cost - matches the "Live Budget Meter" in the UI.
CREATE FUNCTION trg_payments_before_insert_budget_check() RETURNS TRIGGER AS $$
DECLARE
  v_work_budget DECIMAL(15,2);
  v_utilized DECIMAL(15,2);
BEGIN
  SELECT sanctioned_cost INTO v_work_budget FROM works WHERE id = NEW.work_id;
  SELECT COALESCE(SUM(total_bill_value), 0) INTO v_utilized
    FROM payments WHERE work_id = NEW.work_id AND status <> 'CANCELLED';

  IF (v_utilized + NEW.total_bill_value) > v_work_budget THEN
    RAISE EXCEPTION 'Invoice base cost exceeds remaining work order budget.';
  END IF;

  NEW.cumulative_gross_amount_till_date := v_utilized + NEW.total_bill_value;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_before_insert_budget_check
BEFORE INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION trg_payments_before_insert_budget_check();

CREATE FUNCTION trg_payments_before_update_budget_check() RETURNS TRIGGER AS $$
DECLARE
  v_work_budget DECIMAL(15,2);
  v_utilized DECIMAL(15,2);
BEGIN
  IF NEW.total_bill_value <> OLD.total_bill_value OR NEW.status <> OLD.status THEN
    SELECT sanctioned_cost INTO v_work_budget FROM works WHERE id = NEW.work_id;
    SELECT COALESCE(SUM(total_bill_value), 0) INTO v_utilized
      FROM payments WHERE work_id = NEW.work_id AND status <> 'CANCELLED' AND id <> NEW.id;

    IF NEW.status <> 'CANCELLED' AND (v_utilized + NEW.total_bill_value) > v_work_budget THEN
      RAISE EXCEPTION 'Invoice base cost exceeds remaining work order budget.';
    END IF;

    NEW.cumulative_gross_amount_till_date := v_utilized + CASE WHEN NEW.status = 'CANCELLED' THEN 0 ELSE NEW.total_bill_value END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_before_update_budget_check
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION trg_payments_before_update_budget_check();

-- Cross-table date guardrails (can't be plain CHECK constraints - they read
-- departments). Enforces:
--   invoice_date >= departments.gstin_registration_date (when set)
--   agreement_date_snapshot / invoice_date <= CURRENT_DATE, unless the
--     department's allow_future_payment_dates override is on.
-- token_generated_date and actual_payment_date are deliberately exempt - the
-- treasury may legitimately generate a token after entry, and reconciliation
-- always trails the actual event.
CREATE FUNCTION trg_payments_before_date_check() RETURNS TRIGGER AS $$
DECLARE
  v_gstin_registration_date DATE;
  v_allow_future BOOLEAN;
BEGIN
  SELECT gstin_registration_date, allow_future_payment_dates
    INTO v_gstin_registration_date, v_allow_future
    FROM departments WHERE id = NEW.department_id;

  IF v_gstin_registration_date IS NOT NULL AND NEW.invoice_date < v_gstin_registration_date THEN
    RAISE EXCEPTION 'Invoice date cannot be before the department''s GSTIN registration date.';
  END IF;

  IF NOT COALESCE(v_allow_future, FALSE) THEN
    IF NEW.agreement_date_snapshot > CURRENT_DATE THEN
      RAISE EXCEPTION 'Agreement date cannot be in the future.';
    END IF;
    IF NEW.invoice_date > CURRENT_DATE THEN
      RAISE EXCEPTION 'Invoice date cannot be in the future.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_before_insert_date_check
BEFORE INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION trg_payments_before_date_check();

CREATE TRIGGER trg_payments_before_update_date_check
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION trg_payments_before_date_check();

-- ============================================================================
-- SECTION 9: REPORTING VIEWS (direct-SQL/BI use; the app computes these via
-- Prisma aggregate queries instead, see the NOTES section at the bottom)
-- ============================================================================

CREATE VIEW v_scheme_budget_summary AS
SELECT
  s.id AS scheme_id,
  s.department_id,
  s.scheme_name,
  s.financial_year,
  s.sanctioned_budget,
  COALESCE(SUM(w.sanctioned_cost), 0) AS allocated_to_works,
  s.sanctioned_budget - COALESCE(SUM(w.sanctioned_cost), 0) AS remaining_scheme_budget
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
  COALESCE(SUM(p.total_bill_value), 0) AS utilized_amount,
  w.sanctioned_cost - COALESCE(SUM(p.total_bill_value), 0) AS remaining_balance
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
('TAX_LEDGER_REPORT', 'Reports', 'Consolidated tax/audit summary reports'),
('AUDIT_LOGS', 'Audit Logs', 'View system-wide change history'),
('USER_MANAGEMENT', 'User Management', 'Manage staff accounts and permissions'),
('DEPARTMENT_SETTINGS', 'Department Settings', 'Department profile and DDO configuration'),
('EMPLOYEE_MASTER', 'Employee Details', 'Departmental staff directory for salary payments'),
('SALARY_PAYMENT_ENTRY', 'Salary Payments', 'Salary, DA, arrears, and other employee payment entries');

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
-- 5. payments.total_bill_value, total_deductions, and net_payable_amount
--    are NOT DB-generated here (Postgres forbids a generated column from
--    referencing another generated column) - the app MUST compute and set
--    all three on every insert/update via calculatePayment() in
--    src/lib/payment-calc.ts, which mirrors these exact formulas.
-- ============================================================================
