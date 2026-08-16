import { Document, Page, View, Text } from "@react-pdf/renderer";
import { Letterhead, type LetterheadDepartment } from "./Letterhead";
import { styles } from "./styles";

export type ContractorCertificateRow = {
  invoice_number: string;
  invoice_date: string;
  work_name_snapshot: string;
  base_cost: number;
  total_deductions: number;
  net_payable_amount: number;
  treasury_payment_date: string | null;
};

export type ContractorPaymentCertificateData = {
  department: LetterheadDepartment;
  ddo: { ddo_name: string; designation: string } | null;
  contractor: { firm_name: string; pan_number: string; gstin: string | null };
  periodFrom: string;
  periodTo: string;
  rows: ContractorCertificateRow[];
};

function formatINR(value: number) {
  return `Rs. ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function ContractorPaymentCertificateDocument({
  department,
  ddo,
  contractor,
  periodFrom,
  periodTo,
  rows,
}: ContractorPaymentCertificateData) {
  const totals = rows.reduce(
    (acc, r) => ({
      base: acc.base + r.base_cost,
      deductions: acc.deductions + r.total_deductions,
      net: acc.net + r.net_payable_amount,
    }),
    { base: 0, deductions: 0, net: 0 },
  );

  return (
    <Document title={`Contractor Payment Certificate - ${contractor.firm_name}`}>
      <Page size="A4" style={styles.page}>
        <Letterhead department={department} />

        <Text style={styles.title}>Contractor Payment Certificate</Text>
        <Text style={styles.subtitle}>
          Period: {formatDate(periodFrom)} to {formatDate(periodTo)}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contractor Details</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <View style={styles.labelValue}>
                <Text style={styles.label}>Firm Name</Text>
                <Text style={styles.value}>{contractor.firm_name}</Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.labelValue}>
                <Text style={styles.label}>PAN</Text>
                <Text style={styles.value}>{contractor.pan_number}</Text>
              </View>
              <View style={styles.labelValue}>
                <Text style={styles.label}>GSTIN</Text>
                <Text style={styles.value}>{contractor.gstin ?? "-"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payments in Period</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableHeaderCell}>Invoice # / Date</Text>
              <Text style={styles.tableHeaderCell}>Work</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: "right" }]}>Base Cost</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: "right" }]}>Deductions</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: "right" }]}>Net Payable</Text>
              <Text style={styles.tableHeaderCell}>Treasury Date</Text>
            </View>
            {rows.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 6 }]}>No payments found for this contractor in the selected period.</Text>
              </View>
            ) : (
              rows.map((r) => (
                <View style={styles.tableRow} key={r.invoice_number}>
                  <Text style={styles.tableCell}>
                    {r.invoice_number} / {formatDate(r.invoice_date)}
                  </Text>
                  <Text style={styles.tableCell}>{r.work_name_snapshot}</Text>
                  <Text style={styles.tableCellRight}>{formatINR(r.base_cost)}</Text>
                  <Text style={styles.tableCellRight}>{formatINR(r.total_deductions)}</Text>
                  <Text style={styles.tableCellRight}>{formatINR(r.net_payable_amount)}</Text>
                  <Text style={styles.tableCell}>{formatDate(r.treasury_payment_date)}</Text>
                </View>
              ))
            )}
            {rows.length > 0 ? (
              <View style={styles.totalRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Total</Text>
                <Text style={styles.tableCellRight}>{formatINR(totals.base)}</Text>
                <Text style={styles.tableCellRight}>{formatINR(totals.deductions)}</Text>
                <Text style={styles.tableCellRight}>{formatINR(totals.net)}</Text>
                <Text style={styles.tableCell} />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.netPayableBox}>
          <Text style={styles.netPayableLabel}>Total Net Payable for Period</Text>
          <Text style={styles.netPayableValue}>{formatINR(totals.net)}</Text>
        </View>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text>{ddo?.ddo_name ?? "Drawing & Disbursing Officer"}</Text>
              <Text>{ddo?.designation ?? ""}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Generated on {new Date().toLocaleString("en-IN")} - System-generated certificate, valid without physical
          signature per departmental digital record policy.
        </Text>
      </Page>
    </Document>
  );
}
