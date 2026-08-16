"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ContractorRow } from "./contractors-table";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  );
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  BLACKLISTED: "destructive",
};

export function ContractorDetailsDialog({ contractor }: { contractor: ContractorRow }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "ghost", size: "sm" })} render={<button type="button" />}>
        View
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {contractor.firm_name}
            <Badge variant={STATUS_VARIANT[contractor.status]}>{contractor.status}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Vendor Code" value={contractor.vendor_code} />
          <Field label="PAN" value={contractor.pan_number} />
          <Field label="GSTIN" value={contractor.gstin} />
          <Field label="Contact Person" value={contractor.contact_person} />
          <Field label="Mobile" value={contractor.phone} />
          <Field label="Email" value={contractor.email} />
          <Field label="Address" value={contractor.address} />
          <div className="sm:col-span-2 border-t pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Bank Details</p>
          </div>
          <Field label="Bank Name" value={contractor.bank_name} />
          <Field label="Bank Branch" value={contractor.bank_branch} />
          <Field label="Account Number" value={contractor.account_number} />
          <Field label="IFSC Code" value={contractor.ifsc_code} />
          <Field label="Account Holder Name" value={contractor.account_holder_name} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
