"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { ContractorFormDialog } from "./contractor-form-dialog";
import { ContractorDetailsDialog } from "./contractor-details-dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  BLACKLISTED: "destructive",
};

export type ContractorRow = {
  id: string;
  firm_name: string;
  vendor_code: string;
  pan_number: string;
  gstin: string;
  address: string;
  contact_person: string;
  phone: string;
  email: string;
  bank_name: string;
  bank_branch: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  status: "ACTIVE" | "INACTIVE" | "BLACKLISTED";
};

export function ContractorsTable({ contractors, can_edit }: { contractors: ContractorRow[]; can_edit: boolean }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contractors;
    return contractors.filter((c) =>
      `${c.firm_name} ${c.pan_number} ${c.gstin} ${c.vendor_code} ${c.contact_person} ${c.phone}`
        .toLowerCase()
        .includes(q),
    );
  }, [contractors, query]);

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by firm name, PAN, GSTIN, vendor code..." />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Firm Name</TableHead>
                <TableHead>PAN</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Bank A/C</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {contractors.length === 0 ? "No contractors yet." : "No contractors match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.firm_name}</TableCell>
                    <TableCell>{c.pan_number}</TableCell>
                    <TableCell>{c.gstin || "-"}</TableCell>
                    <TableCell>{c.phone || "-"}</TableCell>
                    <TableCell>{c.account_number || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      <ContractorDetailsDialog contractor={c} />
                      {can_edit ? (
                        <ContractorFormDialog
                          contractor={c}
                          triggerLabel="Edit"
                          triggerVariant="outline"
                          triggerSize="sm"
                        />
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
