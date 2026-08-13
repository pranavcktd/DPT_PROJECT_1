import { Document, Page, View, Text } from "@react-pdf/renderer";
import { Letterhead, type LetterheadDepartment } from "./Letterhead";
import { styles } from "./styles";

export type PaymentCertificateData = {
  department: LetterheadDepartment;
  ddo: { ddo_name: string; designation: string } | null;
  payment: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    contractor_name_snapshot: string;
    contractor_pan: string;
    contractor_gstin_snapshot: string | null;
    work_name_snapshot: string;
    scheme_name: string;
    agreement_number_snapshot: string;
    agreement_date_snapshot: string;
    base_cost: number;
    gst_rate: number;
    gst_amount: number;
    total_bill_value: number;
    it_tds_rate: number;
    it_tds_amount: number;
    gst_tds_type: string;
    gst_tds_rate: number;
    cgst_tds_amount: number;
    sgst_tds_amount: number;
    igst_tds_amount: number;
    labour_cess_rate: number;
    labour_cess_amount: number;
    royalty_amount: number;
    stamp_duty_amount: number;
    other_deduction_amount: number;
    other_deduction_remarks: string | null;
    total_deductions: number;
    net_payable_amount: number;
    cumulative_gross_amount_till_date: number;
    treasury_token_number: string | null;
    treasury_payment_date: string | null;
    status: string;
  };
};

function formatINR(value: number) {
  return `Rs. ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function PaymentCertificateDocument({ department, ddo, payment }: PaymentCertificateData) {
  return (
    <Document title={`Payment Certificate - ${payment.invoice_number}`}>
      <Page size="A4" style={styles.page}>
        <Letterhead department={department} />

        <Text style={styles.title}>Running Account Bill - Payment Certificate</Text>
        <Text style={styles.subtitle}>
          Certificate Ref: PMT-{payment.id} | Status: {payment.status}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work &amp; Contractor Details</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <View style={styles.labelValue}>
                <Text style={styles.label}>Scheme</Text>
                <Text style={styles.value}>{payment.scheme_name}</Text>
              </View>
              <View style={styles.labelValue}>
                <Text style={styles.label}>Work Name</Text>
                <Text style={styles.value}>{payment.work_name_snapshot}</Text>
              </View>
              <View style={styles.labelValue}>
                <Text style={styles.label}>Agreement No.</Text>
                <Text style={styles.value}>{payment.agreement_number_snapshot}</Text>
              </View>
              <View style={styles.labelValue}>
                <Text style={styles.label}>Agreement Date</Text>
                <Text style={styles.value}>{formatDate(payment.agreement_date_snapshot)}</Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.labelValue}>
                <Text style={styles.label}>Contractor</Text>
                <Text style={styles.value}>{payment.contractor_name_snapshot}</Text>
              </View>
              <View style={styles.labelValue}>
                <Text style={styles.label}>PAN</Text>
                <Text style={styles.value}>{payment.contractor_pan}</Text>
              </View>
              <View style={styles.labelValue}>
                <Text style={styles.label}>GSTIN</Text>
                <Text style={styles.value}>{payment.contractor_gstin_snapshot ?? "-"}</Text>
              </View>
              <View style={styles.labelValue}>
                <Text style={styles.label}>Invoice No. / Date</Text>
                <Text style={styles.value}>
                  {payment.invoice_number} / {formatDate(payment.invoice_date)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill Value</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableHeaderCell}>Particulars</Text>
              <Text style={styles.tableHeaderCell}>Rate</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: "right" }]}>Amount</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Cost of Work Done (Base Cost)</Text>
              <Text style={styles.tableCell}>-</Text>
              <Text style={styles.tableCellRight}>{formatINR(payment.base_cost)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>GST Payable</Text>
              <Text style={styles.tableCell}>{payment.gst_rate}%</Text>
              <Text style={styles.tableCellRight}>{formatINR(payment.gst_amount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.tableCell}>Total Bill Value</Text>
              <Text style={styles.tableCell} />
              <Text style={styles.tableCellRight}>{formatINR(payment.total_bill_value)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statutory &amp; Retainage Deductions (on Base Cost)</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableHeaderCell}>Particulars</Text>
              <Text style={styles.tableHeaderCell}>Rate</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: "right" }]}>Amount</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Income Tax TDS</Text>
              <Text style={styles.tableCell}>{payment.it_tds_rate}%</Text>
              <Text style={styles.tableCellRight}>{formatINR(payment.it_tds_amount)}</Text>
            </View>
            {payment.gst_tds_type === "INTRA_STATE" ? (
              <>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>CGST TDS</Text>
                  <Text style={styles.tableCell}>{payment.gst_tds_rate / 2}%</Text>
                  <Text style={styles.tableCellRight}>{formatINR(payment.cgst_tds_amount)}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>SGST TDS</Text>
                  <Text style={styles.tableCell}>{payment.gst_tds_rate / 2}%</Text>
                  <Text style={styles.tableCellRight}>{formatINR(payment.sgst_tds_amount)}</Text>
                </View>
              </>
            ) : payment.gst_tds_type === "INTER_STATE" ? (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>IGST TDS</Text>
                <Text style={styles.tableCell}>{payment.gst_tds_rate}%</Text>
                <Text style={styles.tableCellRight}>{formatINR(payment.igst_tds_amount)}</Text>
              </View>
            ) : null}
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Labour Welfare Cess</Text>
              <Text style={styles.tableCell}>{payment.labour_cess_rate}%</Text>
              <Text style={styles.tableCellRight}>{formatINR(payment.labour_cess_amount)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Royalty Charges</Text>
              <Text style={styles.tableCell}>-</Text>
              <Text style={styles.tableCellRight}>{formatINR(payment.royalty_amount)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Stamp Duty / Retention</Text>
              <Text style={styles.tableCell}>-</Text>
              <Text style={styles.tableCellRight}>{formatINR(payment.stamp_duty_amount)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>
                Other Deductions{payment.other_deduction_remarks ? ` (${payment.other_deduction_remarks})` : ""}
              </Text>
              <Text style={styles.tableCell}>-</Text>
              <Text style={styles.tableCellRight}>{formatINR(payment.other_deduction_amount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.tableCell}>Total Deductions</Text>
              <Text style={styles.tableCell} />
              <Text style={styles.tableCellRight}>{formatINR(payment.total_deductions)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.netPayableBox}>
          <Text style={styles.netPayableLabel}>Net Payable Amount</Text>
          <Text style={styles.netPayableValue}>{formatINR(payment.net_payable_amount)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cumulative &amp; Treasury Details</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <View style={styles.labelValue}>
                <Text style={styles.label}>Cumulative Work Done Till Date</Text>
                <Text style={styles.value}>{formatINR(payment.cumulative_gross_amount_till_date)}</Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.labelValue}>
                <Text style={styles.label}>Treasury Token No.</Text>
                <Text style={styles.value}>{payment.treasury_token_number ?? "-"}</Text>
              </View>
              <View style={styles.labelValue}>
                <Text style={styles.label}>Treasury Payment Date</Text>
                <Text style={styles.value}>{formatDate(payment.treasury_payment_date)}</Text>
              </View>
            </View>
          </View>
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
