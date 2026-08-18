import { Megaphone } from "lucide-react";
import { db } from "@/lib/db";
import { MODULE_THEME } from "@/lib/module-theme";
import { cn } from "@/lib/utils";

/** Active, in-window Super-Admin-authored notices for this department - either
 * targeted at it directly or broadcast (department_id IS NULL). Shown at the
 * top of the department Dashboard, e.g. TDS/GSTR-7 filing deadline reminders. */
export async function NoticeBanner({ departmentId }: { departmentId: bigint }) {
  const today = new Date(new Date().toISOString().slice(0, 10));

  const notices = await db.notices.findMany({
    where: {
      is_active: true,
      OR: [{ department_id: null }, { department_id: departmentId }],
      AND: [
        { OR: [{ starts_at: null }, { starts_at: { lte: today } }] },
        { OR: [{ expires_at: null }, { expires_at: { gte: today } }] },
      ],
    },
    orderBy: { created_at: "desc" },
  });

  if (notices.length === 0) return null;

  const theme = MODULE_THEME.notices;

  return (
    <div className="space-y-2">
      {notices.map((n) => (
        <div key={n.id.toString()} className={cn("flex items-start gap-3 rounded-xl border p-3", theme.pill)}>
          <Megaphone className={cn("mt-0.5 size-4 shrink-0", theme.text)} />
          <div className="min-w-0">
            <p className="text-sm font-medium">{n.title}</p>
            <p className="text-sm">{n.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
