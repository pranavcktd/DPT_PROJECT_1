import { View, Text, Image } from "@react-pdf/renderer";
import { styles } from "./styles";

export type LetterheadDepartment = {
  department_name: string;
  office_address: string | null;
  district: string | null;
  state: string | null;
  gstin: string | null;
  pan: string | null;
  tan: string | null;
  logo: { data: Buffer; format: "png" | "jpg" } | null;
};

export function Letterhead({ department }: { department: LetterheadDepartment }) {
  const locality = [department.district, department.state].filter(Boolean).join(", ");

  return (
    <View style={styles.letterheadRow}>
      {department.logo ? <Image style={styles.logo} src={department.logo} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.deptName}>{department.department_name}</Text>
        {department.office_address ? <Text style={styles.deptDetail}>{department.office_address}</Text> : null}
        {locality ? <Text style={styles.deptDetail}>{locality}</Text> : null}
        <Text style={styles.deptDetail}>
          {[
            department.gstin ? `GSTIN: ${department.gstin}` : null,
            department.pan ? `PAN: ${department.pan}` : null,
            department.tan ? `TAN: ${department.tan}` : null,
          ]
            .filter(Boolean)
            .join("   |   ")}
        </Text>
      </View>
    </View>
  );
}
