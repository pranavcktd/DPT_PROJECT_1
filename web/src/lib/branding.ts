import "server-only";
import { db } from "@/lib/db";

export type Branding = {
  companyName: string;
  tagline: string;
  contactEmail: string | null;
  contactPhone: string | null;
};

const FALLBACK: Branding = {
  companyName: "Corenexgen AI Technologies Pvt Ltd",
  tagline: "Designed and developed by Corenexgen AI Technologies Pvt Ltd",
  contactEmail: "info@corenexgenai.in",
  contactPhone: "+91 6388243575",
};

/** Single global row - no department scoping, this is the software
 * company's own branding shown on the login page and in-app footer. */
export async function getBranding(): Promise<Branding> {
  const row = await db.app_branding.findFirst({ orderBy: { id: "asc" } });
  if (!row) return FALLBACK;
  return {
    companyName: row.company_name,
    tagline: row.tagline,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
  };
}
