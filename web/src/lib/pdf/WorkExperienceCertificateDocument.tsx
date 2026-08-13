import { Document, Page, View, Text } from "@react-pdf/renderer";
import { Letterhead, type LetterheadDepartment } from "./Letterhead";
import { styles } from "./styles";

export type WorkExperienceCertificateData = {
  department: LetterheadDepartment;
  ddo: { ddo_name: string; designation: string } | null;
  certificate: {
    certificate_number: string;
    issued_at: string;
    contractor_name: string;
    contractor_pan: string;
    contractor_gstin: string | null;
    work_name: string;
    agreement_number: string | null;
    agreement_date: string | null;
    scheme_name: string;
    stated_completion_date: string | null;
    actual_completion_date: string | null;
    sanctioned_value: number;
    executed_value: number;
    performance_rating_label: string | null;
    performance_rating_score: number | null;
    remarks: string | null;
  };
};

function formatINR(value: number) {
  return `Rs. ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function titleCase(value: string | null) {
  if (!value) return "-";
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function WorkExperienceCertificateDocument({ department, ddo, certificate: c }: WorkExperienceCertificateData) {
  return (
    <Document title={`Work Experience Certificate - ${c.certificate_number}`}>
      <Page size="A4" style={styles.page}>
        <Letterhead department={department} />

        <Text style={styles.title}>Work Experience / Completion Certificate</Text>
        <Text style={styles.subtitle}>Certificate No: {c.certificate_number}</Text>

        <View style={{ marginBottom: 14, marginTop: 6 }}>
          <Text style={{ fontSize: 10, lineHeight: 1.6 }}>
            This is to certify that {c.contractor_name} (PAN: {c.contractor_pan}
            {c.contractor_gstin ? `, GSTIN: ${c.contractor_gstin}` : ""}) has satisfactorily executed the work
            described below under {department.department_name}, and the performance is assessed as{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{titleCase(c.performance_rating_label)}</Text>.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Details</Text>
          <View style={styles.labelValue}>
            <Text style={styles.label}>Scheme</Text>
            <Text style={styles.value}>{c.scheme_name}</Text>
          </View>
          <View style={styles.labelValue}>
            <Text style={styles.label}>Work Name</Text>
            <Text style={styles.value}>{c.work_name}</Text>
          </View>
          <View style={styles.labelValue}>
            <Text style={styles.label}>Agreement No. / Date</Text>
            <Text style={styles.value}>
              {c.agreement_number ?? "-"} / {formatDate(c.agreement_date)}
            </Text>
          </View>
          <View style={styles.labelValue}>
            <Text style={styles.label}>Stated Completion Date</Text>
            <Text style={styles.value}>{formatDate(c.stated_completion_date)}</Text>
          </View>
          <View style={styles.labelValue}>
            <Text style={styles.label}>Actual Completion Date</Text>
            <Text style={styles.value}>{formatDate(c.actual_completion_date)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableHeaderCell}>Particulars</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: "right" }]}>Value</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Original Sanctioned Tender Value</Text>
              <Text style={styles.tableCellRight}>{formatINR(c.sanctioned_value)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.tableCell}>Final Executed Value</Text>
              <Text style={styles.tableCellRight}>{formatINR(c.executed_value)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Assessment</Text>
          <View style={styles.labelValue}>
            <Text style={styles.label}>Rating</Text>
            <Text style={styles.value}>
              {titleCase(c.performance_rating_label)}
              {c.performance_rating_score !== null ? ` (${c.performance_rating_score}/10)` : ""}
            </Text>
          </View>
          {c.remarks ? (
            <View style={styles.labelValue}>
              <Text style={styles.label}>Remarks</Text>
              <Text style={styles.value}>{c.remarks}</Text>
            </View>
          ) : null}
        </View>

        <Text style={{ fontSize: 8, color: "#4B5563", marginTop: 4 }}>
          This certificate is issued for the purpose of supporting future tender applications and does not
          constitute a financial instrument.
        </Text>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text>{ddo?.ddo_name ?? "Drawing & Disbursing Officer"}</Text>
              <Text>{ddo?.designation ?? ""}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Issued on {formatDate(c.issued_at)} - System-generated certificate, valid without physical signature per
          departmental digital record policy.
        </Text>
      </Page>
    </Document>
  );
}
