import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Passw0rd!";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const superAdminRole = await db.roles.findUniqueOrThrow({ where: { role_code: "SUPER_ADMIN" } });

  const superAdmin = await db.users.upsert({
    where: { email: "superadmin@example.com" },
    update: {},
    create: {
      role_id: superAdminRole.id,
      name: "Software Company Super Admin",
      email: "superadmin@example.com",
      password_hash: passwordHash,
      status: "ACTIVE",
    },
  });

  const department = await db.departments.upsert({
    where: { tenant_code: "PWD-DEMO" },
    update: {},
    create: {
      tenant_code: "PWD-DEMO",
      department_name: "Public Works Department (Demo Division)",
      office_address: "PWD Bhavan, MG Road",
      district: "Bengaluru Urban",
      state: "Karnataka",
      gstin: "29AAAAA0000A1Z5",
      pan: "AAAAA0000A",
      official_email: "pwd-demo@example.gov.in",
      contact_number: "080-12345678",
      status: "ACTIVE",
      created_by: superAdmin.id,
    },
  });

  await db.ddo_details.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      department_id: department.id,
      ddo_name: "R. Kumar",
      designation: "Executive Engineer",
      ddo_code: "DDO-PWD-001",
      treasury_registration_code: "TRY-KA-0456",
      is_primary: true,
      status: "ACTIVE",
    },
  });

  const allModules = await db.modules.findMany();
  await db.department_modules.createMany({
    data: allModules.map((m) => ({
      department_id: department.id,
      module_id: m.id,
      is_enabled: true,
      enabled_by: superAdmin.id,
    })),
    skipDuplicates: true,
  });

  const roleUsers: { roleCode: string; name: string; email: string }[] = [
    { roleCode: "DEPARTMENT_ADMIN", name: "Dept Admin Demo", email: "deptadmin@example.com" },
    { roleCode: "EXECUTIVE_ENGINEER", name: "Executive Engineer Demo", email: "engineer@example.com" },
    { roleCode: "DATA_ENTRY_OPERATOR", name: "Data Entry Demo", email: "dataentry@example.com" },
    { roleCode: "AUDITOR", name: "Auditor Demo", email: "auditor@example.com" },
  ];

  for (const ru of roleUsers) {
    const role = await db.roles.findUniqueOrThrow({ where: { role_code: ru.roleCode } });
    const user = await db.users.upsert({
      where: { email: ru.email },
      update: {},
      create: {
        department_id: department.id,
        role_id: role.id,
        name: ru.name,
        email: ru.email,
        password_hash: passwordHash,
        status: "ACTIVE",
        created_by: superAdmin.id,
      },
    });

    const isAdmin = ru.roleCode === "DEPARTMENT_ADMIN";
    const canWrite = isAdmin || ru.roleCode === "DATA_ENTRY_OPERATOR";
    const canApprove = isAdmin || ru.roleCode === "EXECUTIVE_ENGINEER";
    // Department profile and staff account management are Department Admin's
    // job alone - other roles get no access at all, not even view.
    const isAdminOnlyModule = (code: string) => code === "DEPARTMENT_SETTINGS" || code === "USER_MANAGEMENT";

    await db.user_module_permissions.createMany({
      data: allModules
        .filter((m) => !isAdminOnlyModule(m.module_code) || isAdmin)
        .map((m) => ({
          user_id: user.id,
          module_id: m.id,
          can_view: true,
          can_create: isAdminOnlyModule(m.module_code) ? isAdmin : canWrite,
          can_edit: isAdminOnlyModule(m.module_code) ? isAdmin : canWrite || canApprove,
          can_delete: isAdmin,
        })),
      skipDuplicates: true,
    });
  }

  console.log("Seed complete. Demo accounts (all use password:", DEMO_PASSWORD, "):");
  console.log("  superadmin@example.com   - Super Admin");
  console.log("  deptadmin@example.com    - Department Admin (PWD-DEMO)");
  console.log("  engineer@example.com     - Executive Engineer / Approver");
  console.log("  dataentry@example.com    - Data Entry Operator");
  console.log("  auditor@example.com      - Auditor / Viewer");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
