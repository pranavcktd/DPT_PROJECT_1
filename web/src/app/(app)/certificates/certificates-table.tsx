"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { formatEnumLabel } from "@/lib/utils";

export type CertificateRow = {
  id: string;
  certificate_number: string;
  contractor_name: string;
  work_name: string;
  executed_value: number;
  performance_rating_label: string | null;
  issued_at: string;
};

export function CertificatesTable({ certificates }: { certificates: CertificateRow[] }) {
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
                <TableHead className="text-right">PDF</TableHead>
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
                    <TableCell className="text-right">
                      <a
                        href={`/api/work-experience-certificates/${c.id}/certificate`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        View PDF
                      </a>
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
