import { StyleSheet } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 36,
    color: "#111827",
  },
  letterheadRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottom: "2 solid #111827",
    paddingBottom: 8,
    marginBottom: 12,
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  deptName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  deptDetail: {
    fontSize: 8,
    color: "#374151",
    marginTop: 1,
  },
  title: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 8,
    textAlign: "center",
    color: "#374151",
    marginBottom: 12,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#F3F4F6",
    padding: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
  },
  col: {
    flex: 1,
  },
  labelValue: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    width: 120,
    color: "#4B5563",
  },
  value: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
  },
  table: {
    borderTop: "1 solid #D1D5DB",
    borderLeft: "1 solid #D1D5DB",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeaderCell: {
    flex: 1,
    borderRight: "1 solid #D1D5DB",
    borderBottom: "1 solid #D1D5DB",
    backgroundColor: "#F3F4F6",
    padding: 4,
    fontFamily: "Helvetica-Bold",
  },
  tableCell: {
    flex: 1,
    borderRight: "1 solid #D1D5DB",
    borderBottom: "1 solid #D1D5DB",
    padding: 4,
  },
  tableCellRight: {
    flex: 1,
    borderRight: "1 solid #D1D5DB",
    borderBottom: "1 solid #D1D5DB",
    padding: 4,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    fontFamily: "Helvetica-Bold",
  },
  netPayableBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#111827",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  netPayableLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  netPayableValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  signatureBlock: {
    marginTop: 48,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signatureBox: {
    width: 200,
    textAlign: "center",
  },
  signatureLine: {
    borderTop: "1 solid #111827",
    marginTop: 36,
    paddingTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 7,
    color: "#9CA3AF",
    textAlign: "center",
    borderTop: "0.5 solid #E5E7EB",
    paddingTop: 4,
  },
});
