"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { SendEmailDialog } from "@/components/send-email-dialog";
import { formatEnumLabel } from "@/lib/utils";
import { emailWorkExperienceCertificate } from "./email-actions";
import { DeleteCertificateDialog } from "./delete-certificate-dialog";

export type CertificateRow = {
  id: string;
  certificate_number: string;
  contractor_name: string;
  contractor_email: string | null;
  work_name: string;
  executed_value: number;
  performance_rating_label: string | null;
  issued_at: string;
};

export function CertificatesTable({
  certificates,
  can_edit,
  can_delete,
}: {
  certificates: CertificateRow[];
  can_edit: boolean;
  can_delete: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter((c) =>
      `${c.certificate_number} ${c.contractor_name} ${c.work_name}`.toLowerCase().includes(q),
    );
  }, [certificates, query]);

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by certificate #, contractor, work..." />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificate #</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Work</TableHead>
                <TableHead className="text-right">Executed Value</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {certificates.length === 0 ? "No certificates issued yet." : "No certificates match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.certificate_number}</TableCell>
                    <TableCell>{c.contractor_name}</TableCell>
                    <TableCell>{c.work_name}</TableCell>
                    <TableCell className="text-right">
                      ₹{c.executed_value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {c.performance_rating_label ? formatEnumLabel(c.performance_rating_label) : "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.issued_at}</TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      <a
                        href={`/api/work-experience-certificates/${c.id}/certificate`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        View PDF
                      </a>
                      <SendEmailDialog
                        action={emailWorkExperienceCertificate}
                        defaultEmail={c.contractor_email ?? ""}
                        extraFields={{ certificateId: c.id }}
                        triggerLabel="Email"
                        size="sm"
                      />
                      {can_edit ? (
                        <Link href={`/certificates/${c.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                          Edit
                        </Link>
                      ) : null}
                      {can_delete ? (
                        <DeleteCertificateDialog certificateId={c.id} certificateNumber={c.certificate_number} />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
