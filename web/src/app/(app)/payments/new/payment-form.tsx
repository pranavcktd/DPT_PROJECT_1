"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { calculatePayment, deriveGstTdsType, type DeductionType } from "@/lib/payment-calc";
import { formatEnumLabel } from "@/lib/utils";
import { PAY_MODES, paymentFormSchema, type PaymentFormInput, type PaymentFormValues } from "../schema";
import { createPayment, updatePayment } from "../actions";

type WorkOption = {
  id: string;
  work_name: string;
  scheme_name: string;
  sanctioned: number;
  utilized: number;
  remaining: number;
};
type ContractorOption = {
  id: string;
  firm_name: string;
  pan_number: string;
  gstin: string | null;
  gst_state_code: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
};

type FormReturn = UseFormReturn<PaymentFormInput, unknown, PaymentFormValues>;

const TABS = ["work", "invoice", "treasury"] as const;
type TabKey = (typeof TABS)[number];

const TAB_FIELDS: Record<TabKey, (keyof PaymentFormInput)[]> = {
  work: ["work_id", "contractor_id", "agreement_number", "agreement_date"],
  invoice: ["invoice_number", "invoice_date", "base_cost", "gst_rate", "it_tds_rate", "gst_tds_rate", "labour_cess_rate"],
  treasury: ["pay_mode", "treasury_token_number", "token_generated_date", "actual_payment_date"],
};

const TAB_LABELS: Record<TabKey, string> = {
  work: "Work & Contractor",
  invoice: "Invoice & Deductions",
  treasury: "Treasury",
};

const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  NOT_APPLICABLE: "Not Applicable",
  PERCENTAGE: "Percentage (%)",
  FIXED_AMOUNT: "Fixed Amount (₹)",
};

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function numericFieldProps(form: FormReturn, name: "base_cost" | "royalty_value" | "stamp_duty_value" | "other_deduction_value") {
  const field = form.register(name);
  const value = form.watch(name);
  return {
    ...field,
    value: typeof value === "number" ? value : String(value ?? ""),
  };
}

/** A dropdown of preset rates plus an "Others" option that reveals a manual numeric input. */
function RatePresetField({
  form,
  rateField,
  manualField,
  label,
  presets,
}: {
  form: FormReturn;
  rateField: "gst_rate" | "it_tds_rate" | "gst_tds_rate" | "labour_cess_rate";
  manualField: "gst_rate_is_manual" | "it_tds_rate_is_manual" | "gst_tds_rate_is_manual" | "labour_cess_rate_is_manual";
  label: string;
  presets: number[];
}) {
  const isManual = !!form.watch(manualField);
  const rateValue = form.watch(rateField);
  const selectValue = isManual ? "OTHERS" : String(rateValue ?? presets[0] ?? 0);
  const error = form.formState.errors[rateField]?.message as string | undefined;

  return (
    <div className="space-y-2">
      <FormLabel>{label}</FormLabel>
      <div className="flex gap-2">
        <Select
          value={selectValue}
          onValueChange={(v) => {
            if (v === "OTHERS") {
              form.setValue(manualField, true as never);
            } else {
              form.setValue(manualField, false as never);
              form.setValue(rateField, Number(v) as never);
            }
          }}
        >
          <SelectTrigger className="w-28">
            <SelectValue>{(v: string) => (v === "OTHERS" ? "Others" : `${v}%`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p} value={String(p)}>
                {p}%
              </SelectItem>
            ))}
            <SelectItem value="OTHERS">Others</SelectItem>
          </SelectContent>
        </Select>
        {isManual ? (
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            className="w-28"
            value={typeof rateValue === "number" ? rateValue : String(rateValue ?? "")}
            onChange={(e) => form.setValue(rateField, e.target.value as never)}
          />
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

/** A deduction that's either not applicable, a % of base cost, or a flat rupee amount. */
function AmountOrPercentField({
  form,
  typeField,
  valueField,
  label,
}: {
  form: FormReturn;
  typeField: "royalty_type" | "stamp_duty_type" | "other_deduction_type";
  valueField: "royalty_value" | "stamp_duty_value" | "other_deduction_value";
  label: string;
}) {
  const type = form.watch(typeField) as DeductionType;
  const value = form.watch(valueField);

  return (
    <div className="space-y-2">
      <FormLabel>{label}</FormLabel>
      <div className="flex gap-2">
        <Select value={type} onValueChange={(v) => form.setValue(typeField, v as never)}>
          <SelectTrigger className="w-40">
            <SelectValue>{(v: DeductionType) => DEDUCTION_TYPE_LABELS[v]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NOT_APPLICABLE">Not Applicable</SelectItem>
            <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
            <SelectItem value="FIXED_AMOUNT">Fixed Amount (₹)</SelectItem>
          </SelectContent>
        </Select>
        {type !== "NOT_APPLICABLE" ? (
          <Input
            type="number"
            step="0.01"
            min="0"
            value={typeof value === "number" ? value : String(value ?? "")}
            onChange={(e) => form.setValue(valueField, e.target.value as never)}
          />
        ) : null}
      </div>
    </div>
  );
}

export function PaymentForm({
  works,
  contractors,
  departmentStateCode,
  payment,
}: {
  works: WorkOption[];
  contractors: ContractorOption[];
  departmentStateCode: string | null;
  payment?: (PaymentFormValues & { id: string });
}) {
  const router = useRouter();
  const isEdit = !!payment;
  const [activeTab, setActiveTab] = useState<TabKey>("work");
  const [completedTabs, setCompletedTabs] = useState<Set<TabKey>>(new Set());
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<PaymentFormInput, unknown, PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: payment ?? {
      work_id: "",
      contractor_id: "",
      agreement_number: "",
      agreement_date: "",
      invoice_number: "",
      invoice_date: "",
      base_cost: 0,
      gst_rate: 0,
      gst_rate_is_manual: false,
      it_tds_rate: 0,
      it_tds_rate_is_manual: false,
      gst_tds_rate: 0,
      gst_tds_rate_is_manual: false,
      gst_tds_type: "NOT_APPLICABLE",
      labour_cess_rate: 0,
      labour_cess_rate_is_manual: false,
      royalty_type: "NOT_APPLICABLE",
      royalty_value: 0,
      stamp_duty_type: "NOT_APPLICABLE",
      stamp_duty_value: 0,
      other_deduction_type: "NOT_APPLICABLE",
      other_deduction_value: 0,
      other_deduction_remarks: "",
      pay_mode: "TREASURY",
      treasury_token_number: "",
      token_generated_date: "",
      actual_payment_date: "",
      remarks: "",
    },
  });

  const watched = form.watch();
  const selectedWork = works.find((w) => w.id === watched.work_id);
  const selectedContractor = contractors.find((c) => c.id === watched.contractor_id);
  const gstTdsType = deriveGstTdsType(departmentStateCode, selectedContractor?.gst_state_code ?? null);

  useEffect(() => {
    form.setValue("gst_tds_type", gstTdsType);
  }, [gstTdsType, form]);

  const baseCost = typeof watched.base_cost === "number" ? watched.base_cost : Number(watched.base_cost) || 0;
  const calc = calculatePayment({
    baseCost,
    gstRate: Number(watched.gst_rate) || 0,
    itTdsRate: Number(watched.it_tds_rate) || 0,
    gstTdsRate: Number(watched.gst_tds_rate) || 0,
    gstTdsType,
    labourCessRate: Number(watched.labour_cess_rate) || 0,
    royaltyType: watched.royalty_type as DeductionType,
    royaltyValue: Number(watched.royalty_value) || 0,
    stampDutyType: watched.stamp_duty_type as DeductionType,
    stampDutyValue: Number(watched.stamp_duty_value) || 0,
    otherDeductionType: watched.other_deduction_type as DeductionType,
    otherDeductionValue: Number(watched.other_deduction_value) || 0,
  });

  // When editing, this payment's own base cost is already counted in the
  // work's "utilized" figure - add it back so the projection reflects
  // budget free excluding this record's own existing allocation.
  const ownExistingBaseCost = isEdit && payment.work_id === watched.work_id ? Number(payment.base_cost) : 0;
  const effectiveRemaining = selectedWork ? selectedWork.remaining + ownExistingBaseCost : undefined;
  const projectedRemaining = effectiveRemaining !== undefined ? effectiveRemaining - baseCost : undefined;
  const overBudget = projectedRemaining !== undefined && projectedRemaining < 0;
  const workForMeter =
    selectedWork && ownExistingBaseCost > 0
      ? { ...selectedWork, utilized: selectedWork.utilized - ownExistingBaseCost, remaining: effectiveRemaining! }
      : selectedWork;

  async function goToTab(target: TabKey) {
    const currentIndex = TABS.indexOf(activeTab);
    const targetIndex = TABS.indexOf(target);
    if (targetIndex <= currentIndex) {
      setActiveTab(target);
      return;
    }
    const valid = await form.trigger(TAB_FIELDS[activeTab]);
    if (valid) {
      setCompletedTabs((prev) => new Set(prev).add(activeTab));
      setActiveTab(target);
    }
  }

  async function onSubmit(values: PaymentFormValues) {
    setServerError(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, String(value ?? "")));

    const result = isEdit
      ? await updatePayment(payment.id, { error: null }, formData)
      : await createPayment({ error: null }, formData);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    router.push("/payments");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Payment Entry" : "New Payment Entry"}</CardTitle>
          <CardDescription>Running Account (RA) bill against a work order.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={(v) => goToTab(v as TabKey)}>
                <TabsList className="grid w-full grid-cols-3">
                  {TABS.map((tab, index) => (
                    <TabsTrigger key={tab} value={tab} className="gap-1.5">
                      <span
                        className={
                          "flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold " +
                          (completedTabs.has(tab)
                            ? "bg-emerald-600 text-white"
                            : activeTab === tab
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground")
                        }
                      >
                        {completedTabs.has(tab) ? "✓" : index + 1}
                      </span>
                      {TAB_LABELS[tab]}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="work" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="work_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Order</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a work order">
                                {(v: string) => {
                                  const w = works.find((w) => w.id === v);
                                  return w ? `${w.work_name} (${w.scheme_name})` : v;
                                }}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {works.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.work_name} ({w.scheme_name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contractor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contractor</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a contractor">
                                {(v: string) => contractors.find((c) => c.id === v)?.firm_name ?? v}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {contractors.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.firm_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedContractor ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
                      <span className="text-muted-foreground">PAN</span>
                      <span>{selectedContractor.pan_number}</span>
                      <span className="text-muted-foreground">GSTIN</span>
                      <span>{selectedContractor.gstin ?? "-"}</span>
                      <span className="text-muted-foreground">Bank</span>
                      <span>
                        {selectedContractor.bank_name ?? "-"} {selectedContractor.account_number ? `(${selectedContractor.account_number})` : ""}
                      </span>
                      <span className="text-muted-foreground">GST TDS Type</span>
                      <span>
                        <Badge variant={gstTdsType === "NOT_APPLICABLE" ? "outline" : "secondary"}>
                          {gstTdsType === "NOT_APPLICABLE" ? "N/A - missing GSTIN or dept state code" : gstTdsType.replace("_", "-")}
                        </Badge>
                      </span>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="agreement_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agreement Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="agreement_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agreement Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {selectedWork ? (
                    <BudgetMeter work={workForMeter!} baseCost={baseCost} />
                  ) : null}

                  <div className="flex justify-end">
                    <Button type="button" onClick={() => goToTab("invoice")}>
                      Next: Invoice &amp; Deductions
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="invoice" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="invoice_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="invoice_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Date</FormLabel>
                          <FormControl>
                            <Input type="date" min={watched.agreement_date || undefined} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormItem>
                    <FormLabel>Cost of Work Done - Base Cost (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...numericFieldProps(form, "base_cost")} />
                    </FormControl>
                    {overBudget ? (
                      <p className="text-sm text-destructive">
                        Exceeds remaining work budget by {formatINR(Math.abs(projectedRemaining ?? 0))}.
                      </p>
                    ) : null}
                  </FormItem>

                  <RatePresetField form={form} rateField="gst_rate" manualField="gst_rate_is_manual" label="GST Payable" presets={[0, 5, 12, 18, 28]} />

                  <Separator />
                  <p className="text-sm font-medium">Statutory &amp; Retainage Deductions (on Base Cost)</p>

                  <RatePresetField form={form} rateField="it_tds_rate" manualField="it_tds_rate_is_manual" label="Income Tax TDS" presets={[0, 1, 2]} />
                  <RatePresetField form={form} rateField="gst_tds_rate" manualField="gst_tds_rate_is_manual" label="GST TDS Rate" presets={[0, 2]} />
                  <RatePresetField
                    form={form}
                    rateField="labour_cess_rate"
                    manualField="labour_cess_rate_is_manual"
                    label="Labour Welfare Cess"
                    presets={[0, 1]}
                  />
                  <AmountOrPercentField form={form} typeField="royalty_type" valueField="royalty_value" label="Royalty Charges" />
                  <AmountOrPercentField form={form} typeField="stamp_duty_type" valueField="stamp_duty_value" label="Stamp Duty / Retention" />
                  <AmountOrPercentField form={form} typeField="other_deduction_type" valueField="other_deduction_value" label="Other Deductions" />
                  <FormField
                    control={form.control}
                    name="other_deduction_remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other Deduction Remarks (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => goToTab("work")}>
                      Back
                    </Button>
                    <Button type="button" onClick={() => goToTab("treasury")}>
                      Next: Treasury
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="treasury" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="pay_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pay Mode</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue>{(v: string) => formatEnumLabel(v)}</SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAY_MODES.map((m) => (
                              <SelectItem key={m} value={m}>
                                {formatEnumLabel(m)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watched.pay_mode === "OTHER_THAN_TREASURY" ? (
                    <FormField
                      control={form.control}
                      name="actual_payment_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Date</FormLabel>
                          <FormControl>
                            <Input type="date" min={watched.invoice_date || undefined} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="treasury_token_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Treasury Token / Chalan Number</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="token_generated_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Token Generated Date</FormLabel>
                            <FormControl>
                              <Input type="date" min={watched.invoice_date || undefined} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watched.pay_mode === "TREASURY" ? (
                    <p className="text-xs text-muted-foreground">
                      {isEdit && payment?.actual_payment_date
                        ? `Reconciled treasury payment date: ${payment.actual_payment_date}. Enter a correction via Treasury Reconciliation.`
                        : "The actual treasury payment date is entered later via Treasury Reconciliation, once the monthly reconciliation statement confirms it. Until then, reports use the token generated date and flag it as estimated."}
                    </p>
                  ) : null}

                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => goToTab("invoice")}>
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting || overBudget}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {form.formState.isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Save Payment Record"}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <SummaryRow label="Base Cost (A)" value={baseCost} />
            <SummaryRow label="GST Payable (B)" value={calc.gstAmount} />
            <SummaryRow label="Total Bill Value (C)" value={calc.totalBillValue} bold />
            <Separator className="my-2" />
            <SummaryRow label="Income Tax TDS" value={calc.itTdsAmount} negative />
            {gstTdsType === "INTRA_STATE" ? (
              <>
                <SummaryRow label="CGST TDS" value={calc.cgstTdsAmount} negative />
                <SummaryRow label="SGST TDS" value={calc.sgstTdsAmount} negative />
              </>
            ) : gstTdsType === "INTER_STATE" ? (
              <SummaryRow label="IGST TDS" value={calc.igstTdsAmount} negative />
            ) : (
              <SummaryRow label="GST TDS" value={0} negative />
            )}
            <SummaryRow label="Labour Welfare Cess" value={calc.labourCessAmount} negative />
            <SummaryRow label="Royalty" value={calc.royaltyAmount} negative />
            <SummaryRow label="Stamp Duty" value={calc.stampDutyAmount} negative />
            <SummaryRow label="Other Deductions" value={calc.otherDeductionAmount} negative />
            <Separator className="my-2" />
            <SummaryRow label="Total Deductions (D)" value={calc.totalDeductions} negative bold />
            <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-600 px-3 py-2.5 text-white">
              <span className="text-sm font-semibold">Net Payable (E)</span>
              <span className="text-base font-bold">{formatINR(calc.netPayableAmount)}</span>
            </div>
          </CardContent>
        </Card>
        {selectedWork ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live Budget Meter</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetMeter work={workForMeter!} baseCost={baseCost} compact />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold, negative, large }: { label: string; value: number; bold?: boolean; negative?: boolean; large?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""} ${large ? "text-base" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>
        {negative && value > 0 ? "-" : ""}
        {formatINR(value)}
      </span>
    </div>
  );
}

function BudgetMeter({ work, baseCost, compact }: { work: WorkOption; baseCost: number; compact?: boolean }) {
  const utilizedPct = work.sanctioned > 0 ? Math.min(100, (work.utilized / work.sanctioned) * 100) : 0;
  const thisPaymentPct = work.sanctioned > 0 ? Math.min(100 - utilizedPct, Math.max(0, (baseCost / work.sanctioned) * 100)) : 0;
  const projectedRemaining = work.remaining - baseCost;
  const overBudget = projectedRemaining < 0;

  return (
    <div className={compact ? "space-y-2" : "space-y-2 rounded-lg border p-3"}>
      {!compact ? <p className="text-sm font-medium">Live Budget Meter - {work.work_name}</p> : null}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-emerald-500" style={{ width: `${utilizedPct}%` }} />
        <div className={`h-full ${overBudget ? "bg-destructive" : "bg-amber-400"}`} style={{ width: `${thisPaymentPct}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Sanctioned</span>
        <span className="text-right">{formatINR(work.sanctioned)}</span>
        <span>Already Utilized</span>
        <span className="text-right">{formatINR(work.utilized)}</span>
        <span>This Payment</span>
        <span className="text-right">{formatINR(baseCost)}</span>
        <span className={overBudget ? "font-medium text-destructive" : "font-medium text-foreground"}>Remaining After</span>
        <span className={`text-right font-medium ${overBudget ? "text-destructive" : "text-foreground"}`}>{formatINR(projectedRemaining)}</span>
      </div>
    </div>
  );
}
