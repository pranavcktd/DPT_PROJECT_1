import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import type { LetterheadDepartment } from "./Letterhead";

export async function getLetterheadDepartment(departmentId: bigint): Promise<LetterheadDepartment> {
  const department = await db.departments.findUniqueOrThrow({ where: { id: departmentId } });

  let logo: LetterheadDepartment["logo"] = null;
  if (department.logo_path) {
    try {
      const format = department.logo_path.toLowerCase().endsWith(".png") ? "png" : "jpg";
      const filePath = path.join(process.cwd(), "public", department.logo_path);
      const data = await readFile(filePath);
      logo = { data, format };
    } catch {
      logo = null;
    }
  }

  return {
    department_name: department.department_name,
    office_address: department.office_address,
    district: department.district,
    state: department.state,
    gstin: department.gstin,
    pan: department.pan,
    tan: department.tan,
    logo,
  };
}

export async function getPrimaryDdo(departmentId: bigint) {
  return db.ddo_details.findFirst({ where: { department_id: departmentId, is_primary: true } });
}
