/**
 * Mirrors the GENERATED ALWAYS AS formulas on the `payments` table in
 * database/schema.sql exactly, so the live UI preview matches what the
 * database will actually store. The database's generated columns remain the
 * authoritative source of truth (this is only for instant UI feedback before
 * the server round-trip).
 */

export type GstTdsType = "INTRA_STATE" | "INTER_STATE" | "NOT_APPLICABLE";
export type DeductionType = "PERCENTAGE" | "FIXED_AMOUNT" | "NOT_APPLICABLE";

export interface PaymentCalcInput {
  baseCost: number;
  gstRate: number;
  itTdsRate: number;
  gstTdsRate: number;
  gstTdsType: GstTdsType;
  labourCessRate: number;
  royaltyType: DeductionType;
  royaltyValue: number;
  stampDutyType: DeductionType;
  stampDutyValue: number;
  otherDeductionType: DeductionType;
  otherDeductionValue: number;
}

export interface PaymentCalcResult {
  gstAmount: number;
  totalBillValue: number;
  itTdsAmount: number;
  cgstTdsAmount: number;
  sgstTdsAmount: number;
  igstTdsAmount: number;
  labourCessAmount: number;
  royaltyAmount: number;
  stampDutyAmount: number;
  otherDeductionAmount: number;
  totalDeductions: number;
  netPayableAmount: number;
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function percentOrFixed(type: DeductionType, value: number, base: number): number {
  if (type === "PERCENTAGE") return round2((base * value) / 100);
  if (type === "FIXED_AMOUNT") return round2(value);
  return 0;
}

export function calculatePayment(input: PaymentCalcInput): PaymentCalcResult {
  const base = input.baseCost || 0;

  const gstAmount = round2((base * input.gstRate) / 100);
  const totalBillValue = round2(base + gstAmount);

  const itTdsAmount = round2((base * input.itTdsRate) / 100);

  const rawGstTds = (base * input.gstTdsRate) / 100;
  const cgstTdsAmount = input.gstTdsType === "INTRA_STATE" ? round2(rawGstTds / 2) : 0;
  const sgstTdsAmount = input.gstTdsType === "INTRA_STATE" ? round2(rawGstTds / 2) : 0;
  const igstTdsAmount = input.gstTdsType === "INTER_STATE" ? round2(rawGstTds) : 0;

  const labourCessAmount = round2((base * input.labourCessRate) / 100);
  const royaltyAmount = percentOrFixed(input.royaltyType, input.royaltyValue, base);
  const stampDutyAmount = percentOrFixed(input.stampDutyType, input.stampDutyValue, base);
  const otherDeductionAmount = percentOrFixed(input.otherDeductionType, input.otherDeductionValue, base);

  const totalDeductions = round2(
    itTdsAmount +
      cgstTdsAmount +
      sgstTdsAmount +
      igstTdsAmount +
      labourCessAmount +
      royaltyAmount +
      stampDutyAmount +
      otherDeductionAmount,
  );
  const netPayableAmount = round2(totalBillValue - totalDeductions);

  return {
    gstAmount,
    totalBillValue,
    itTdsAmount,
    cgstTdsAmount,
    sgstTdsAmount,
    igstTdsAmount,
    labourCessAmount,
    royaltyAmount,
    stampDutyAmount,
    otherDeductionAmount,
    totalDeductions,
    netPayableAmount,
  };
}

/** Compares department vs contractor GST state codes to derive GST TDS type. */
export function deriveGstTdsType(departmentStateCode: string | null, contractorGstStateCode: string | null): GstTdsType {
  if (!departmentStateCode || !contractorGstStateCode) return "NOT_APPLICABLE";
  return departmentStateCode === contractorGstStateCode ? "INTRA_STATE" : "INTER_STATE";
}
