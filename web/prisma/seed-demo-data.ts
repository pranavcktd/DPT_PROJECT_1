/**
 * Populates a department with a realistic, varied dataset (contractors,
 * schemes, work orders, payments spread across several months/quarters)
 * purely for demoing the app and its Tax Reports to clients.
 *
 * Usage: npx tsx prisma/seed-demo-data.ts [TENANT_CODE]
 * Defaults to PWD-DEMO. Safe to re-run - contractor vendor codes and
 * work/scheme names are unique-checked, so a second run just skips what
 * already exists rather than duplicating.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { calculatePayment, deriveGstTdsType, type DeductionType } from "../src/lib/payment-calc";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const TENANT_CODE = process.argv[2] || "PWD-DEMO";

type ContractorSeed = { vendor_code: string; firm_name: string; pan_number: string; gstinSuffix: string; phone: string; email: string; intraState: boolean };

// gstinSuffix is the 13 chars after the 2-digit state code - the state code
// itself gets substituted for the target department's own state at runtime
// (intraState: true) or a fixed different state (intraState: false), so the
// same contractor roster produces a sensible intra/inter-state GST TDS mix
// no matter which department it's seeded against.
const CONTRACTOR_TEMPLATES: ContractorSeed[] = [
  { vendor_code: "V-SUN01", firm_name: "Sunrise Constructions Pvt Ltd", pan_number: "AAACS1234A", gstinSuffix: "AAACS1234A1Z5", phone: "9845011223", email: "accounts@sunriseconstructions.example", intraState: true },
  { vendor_code: "V-BHA02", firm_name: "Bharat Infra Builders", pan_number: "AABCB5678C", gstinSuffix: "AABCB5678C1Z2", phone: "9820033445", email: "billing@bharatinfra.example", intraState: false },
  { vendor_code: "V-KAR03", firm_name: "Regional Road Works", pan_number: "AAECK4321D", gstinSuffix: "AAECK4321D1Z8", phone: "9663344556", email: "info@regionalroadworks.example", intraState: true },
  { vendor_code: "V-DEC04", firm_name: "Deccan Engineering Co", pan_number: "AAFCD8765E", gstinSuffix: "AAFCD8765E1Z1", phone: "9741122334", email: "contact@deccaneng.example", intraState: true },
  { vendor_code: "V-NAT05", firm_name: "National Highways Corp", pan_number: "AABCN2468F", gstinSuffix: "AABCN2468F1Z9", phone: "9910099887", email: "finance@nationalhwycorp.example", intraState: false },
  { vendor_code: "V-VIS06", firm_name: "Vishwa Builders", pan_number: "AAGCV1357G", gstinSuffix: "AAGCV1357G1Z4", phone: "9535566778", email: "office@vishwabuilders.example", intraState: true },
];
// Fixed inter-state codes for the two intraState:false contractors, cycled through.
const OTHER_STATE_CODES = ["27", "07", "33"];

type Dataset = {
  schemes: { scheme_name: string; financial_year: string; sanctioned_budget: number }[];
  works: { work_name: string; scheme_name: string; sanctioned_cost: number }[];
};

const ROAD_BRIDGE_DATASET: Dataset = {
  schemes: [
    { scheme_name: "Rural Road Connectivity Scheme", financial_year: "2025-2026", sanctioned_budget: 50000000 },
    { scheme_name: "Bridge Rehabilitation Programme", financial_year: "2026-2027", sanctioned_budget: 80000000 },
    { scheme_name: "Culvert Modernisation Scheme", financial_year: "2026-2027", sanctioned_budget: 30000000 },
  ],
  works: [
    { work_name: "SH-17 Widening - Kolar to Malur", scheme_name: "Rural Road Connectivity Scheme", sanctioned_cost: 12000000 },
    { work_name: "Village Road Upgradation", scheme_name: "Rural Road Connectivity Scheme", sanctioned_cost: 8000000 },
    { work_name: "Bridge over Arkavathi River", scheme_name: "Bridge Rehabilitation Programme", sanctioned_cost: 20000000 },
    { work_name: "Culvert Reconstruction - NH-48", scheme_name: "Bridge Rehabilitation Programme", sanctioned_cost: 9000000 },
    { work_name: "Culvert Widening Phase 1", scheme_name: "Culvert Modernisation Scheme", sanctioned_cost: 15000000 },
    { work_name: "Culvert Widening Phase 2", scheme_name: "Culvert Modernisation Scheme", sanctioned_cost: 10000000 },
  ],
};

const IRRIGATION_DATASET: Dataset = {
  schemes: [
    { scheme_name: "Minor Irrigation Tank Rehabilitation Scheme", financial_year: "2025-2026", sanctioned_budget: 40000000 },
    { scheme_name: "Canal Lining and Modernisation Programme", financial_year: "2026-2027", sanctioned_budget: 70000000 },
    { scheme_name: "Check Dam Construction Scheme", financial_year: "2026-2027", sanctioned_budget: 25000000 },
  ],
  works: [
    { work_name: "Tank Desilting - Bediyapuliya", scheme_name: "Minor Irrigation Tank Rehabilitation Scheme", sanctioned_cost: 9000000 },
    { work_name: "Tank Bund Strengthening - Karwi", scheme_name: "Minor Irrigation Tank Rehabilitation Scheme", sanctioned_cost: 7000000 },
    { work_name: "Canal Lining Phase 1 - Mau", scheme_name: "Canal Lining and Modernisation Programme", sanctioned_cost: 18000000 },
    { work_name: "Canal Lining Phase 2 - Rajapur", scheme_name: "Canal Lining and Modernisation Programme", sanctioned_cost: 14000000 },
    { work_name: "Check Dam - Paisuni River", scheme_name: "Check Dam Construction Scheme", sanctioned_cost: 11000000 },
    { work_name: "Check Dam - Ohan River", scheme_name: "Check Dam Construction Scheme", sanctioned_cost: 8000000 },
  ],
};

// [year, month, day] - spans FY2025-2026 Q4 through FY2026-2027 Q4 so every
// quarter/month filter in the Tax Reports has something to show.
const PAYMENT_DATES: [number, number, number][] = [
  [2026, 2, 10], [2026, 3, 20],
  [2026, 4, 15], [2026, 5, 22], [2026, 6, 18],
  [2026, 7, 8], [2026, 7, 25], [2026, 8, 5], [2026, 8, 12],
  [2026, 10, 14], [2026, 11, 20], [2026, 12, 28],
  [2027, 1, 10], [2027, 2, 18], [2027, 3, 25],
];

const RATE_PRESETS: { gst: number; itTds: number; gstTds: number; cess: number }[] = [
  { gst: 18, itTds: 2, gstTds: 2, cess: 1 },
  { gst: 12, itTds: 2, gstTds: 2, cess: 1 },
  { gst: 18, itTds: 1, gstTds: 2, cess: 1 },
];

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function main() {
  const department = await db.departments.findUniqueOrThrow({ where: { tenant_code: TENANT_CODE } });
  const departmentStateCode = department.state_code ?? "29";
  const deptAdmin = await db.users.findFirstOrThrow({
    where: { department_id: department.id, roles: { role_code: "DEPARTMENT_ADMIN" } },
    orderBy: { created_at: "asc" },
  });
  const dataset = TENANT_CODE === "PWD-DEMO" ? ROAD_BRIDGE_DATASET : IRRIGATION_DATASET;

  console.log(`Seeding demo data for ${department.department_name} (${TENANT_CODE}), state code ${departmentStateCode}...`);

  const contractorIds: Record<string, bigint> = {};
  let otherStateIdx = 0;
  for (const c of CONTRACTOR_TEMPLATES) {
    const stateCode = c.intraState ? departmentStateCode : OTHER_STATE_CODES[otherStateIdx++ % OTHER_STATE_CODES.length];
    const gstin = `${stateCode}${c.gstinSuffix}`;
    const contractor = await db.contractors.upsert({
      where: { department_id_vendor_code: { department_id: department.id, vendor_code: c.vendor_code } },
      update: {},
      create: {
        department_id: department.id,
        vendor_code: c.vendor_code,
        firm_name: c.firm_name,
        pan_number: c.pan_number,
        gstin,
        phone: c.phone,
        email: c.email,
        bank_name: "State Bank of India",
        bank_branch: `${department.district ?? "Main"} Branch`,
        account_number: `${Math.floor(10000000000 + Math.random() * 89999999999)}`,
        ifsc_code: "SBIN0001234",
        account_holder_name: c.firm_name,
        status: "ACTIVE",
        created_by: deptAdmin.id,
      },
    });
    contractorIds[c.firm_name] = contractor.id;
  }
  console.log(`Contractors ready: ${Object.keys(contractorIds).length}`);

  const schemeIds: Record<string, bigint> = {};
  for (const s of dataset.schemes) {
    const scheme = await db.schemes.upsert({
      where: { department_id_scheme_name_financial_year: { department_id: department.id, scheme_name: s.scheme_name, financial_year: s.financial_year } },
      update: {},
      create: {
        department_id: department.id,
        scheme_name: s.scheme_name,
        financial_year: s.financial_year,
        sanctioned_budget: s.sanctioned_budget,
        status: "ACTIVE",
        created_by: deptAdmin.id,
      },
    });
    schemeIds[s.scheme_name] = scheme.id;
  }
  console.log(`Schemes ready: ${Object.keys(schemeIds).length}`);

  const workIds: { id: bigint; name: string; sanctioned_cost: number }[] = [];
  for (const w of dataset.works) {
    let work = await db.works.findFirst({ where: { department_id: department.id, work_name: w.work_name } });
    if (!work) {
      work = await db.works.create({
        data: {
          department_id: department.id,
          scheme_id: schemeIds[w.scheme_name],
          work_name: w.work_name,
          sanctioned_cost: w.sanctioned_cost,
          status: "ONGOING",
          created_by: deptAdmin.id,
        },
      });
    }
    workIds.push({ id: work.id, name: work.work_name, sanctioned_cost: Number(work.sanctioned_cost) });
  }
  console.log(`Works ready: ${workIds.length}`);

  // Fractions of a work's own sanctioned cost per payment (up to 4 payments/work) - keeps every
  // work comfortably under its budget-guardrail trigger regardless of how many payments it gets.
  const AMOUNT_FRACTIONS = [0.12, 0.09, 0.07, 0.06];

  const contractorList = Object.entries(contractorIds);
  let created = 0;
  let dateIdx = 0;

  for (const work of workIds) {
    const paymentsForThisWork = 2 + (dateIdx % 3); // 2-4 payments per work
    for (let i = 0; i < paymentsForThisWork; i++) {
      const [y, m, d] = PAYMENT_DATES[dateIdx % PAYMENT_DATES.length];
      dateIdx++;
      const [contractorName, contractorId] = contractorList[dateIdx % contractorList.length];
      const contractor = await db.contractors.findUniqueOrThrow({ where: { id: contractorId } });
      const preset = RATE_PRESETS[dateIdx % RATE_PRESETS.length];
      const baseCost = round2(work.sanctioned_cost * AMOUNT_FRACTIONS[i % AMOUNT_FRACTIONS.length]);

      const gstTdsType = deriveGstTdsType(departmentStateCode, contractor.gst_state_code);
      const noDeduction: DeductionType = "NOT_APPLICABLE";
      const calc = calculatePayment({
        baseCost,
        gstRate: preset.gst,
        itTdsRate: preset.itTds,
        gstTdsRate: preset.gstTds,
        gstTdsType,
        labourCessRate: preset.cess,
        royaltyType: noDeduction,
        royaltyValue: 0,
        stampDutyType: noDeduction,
        stampDutyValue: 0,
        otherDeductionType: noDeduction,
        otherDeductionValue: 0,
      });

      const invoiceDate = new Date(Date.UTC(y, m - 1, Math.max(1, d - 5)));
      const treasuryDate = new Date(Date.UTC(y, m - 1, d));
      const invoiceNumber = `INV-DEMO-${work.id}-${dateIdx}`;

      const existing = await db.payments.findFirst({ where: { work_id: work.id, invoice_number: invoiceNumber } });
      if (existing) continue;

      await db.payments.create({
        data: {
          department_id: department.id,
          work_id: work.id,
          contractor_id: contractor.id,
          contractor_name_snapshot: contractor.firm_name,
          contractor_gstin_snapshot: contractor.gstin,
          contractor_pan_snapshot: contractor.pan_number,
          work_name_snapshot: work.name,
          agreement_number_snapshot: `AGR-${work.id}-${dateIdx}`,
          agreement_date_snapshot: new Date(Date.UTC(y, m - 1, 1)),
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          base_cost: baseCost,
          gst_rate: preset.gst,
          gst_rate_is_manual: false,
          total_bill_value: calc.totalBillValue,
          it_tds_rate: preset.itTds,
          it_tds_rate_is_manual: false,
          gst_tds_rate: preset.gstTds,
          gst_tds_rate_is_manual: false,
          gst_tds_type: gstTdsType,
          labour_cess_rate: preset.cess,
          labour_cess_rate_is_manual: false,
          royalty_type: "NOT_APPLICABLE",
          royalty_value: 0,
          stamp_duty_type: "NOT_APPLICABLE",
          stamp_duty_value: 0,
          other_deduction_type: "NOT_APPLICABLE",
          other_deduction_value: 0,
          total_deductions: calc.totalDeductions,
          net_payable_amount: calc.netPayableAmount,
          treasury_token_number: `TKN-${y}${String(m).padStart(2, "0")}-${dateIdx}`,
          treasury_payment_date: treasuryDate,
          status: "SAVED",
          created_by: deptAdmin.id,
        },
      });
      created++;
      console.log(`  payment ${invoiceNumber}  ${contractorName}  ₹${baseCost}  ${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
  }

  console.log(`\nDemo data seed complete for ${TENANT_CODE}. ${created} new payments created.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
