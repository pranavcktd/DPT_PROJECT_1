"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, buttonVariants, type ButtonVariant, type ButtonSize } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatEnumLabel, formatINR } from "@/lib/utils";
import { PartyCombobox } from "@/components/party-combobox";
import { TokenCombobox, type TokenOption } from "@/components/token-combobox";
import { EmployeeFormDialog } from "../employees/employee-form-dialog";
import {
  MONTHS,
  PAY_MODES,
  PAYMENT_TYPES,
  PAYMENT_TYPE_LABELS,
  previousMonth,
  salaryPaymentFormSchema,
  type SalaryPaymentFormInput,
  type SalaryPaymentFormValues,
} from "./schema";
import { createSalaryPayment, updateSalaryPayment } from "./actions";

type EmployeeOption = { id: string; employee_name: string; pan_number: string };
type SalaryPaymentRecord = SalaryPaymentFormValues & { id: string };

const CURRENT_YEAR = new Date().getUTCFullYear();
const YEAR_PRESETS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

function numericProps(field: { value: unknown }, onChange: (v: string) => void) {
  return {
    value: typeof field.value === "number" ? field.value : String(field.value ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
  };
}

export function SalaryPaymentFormDialog({
  employees,
  tokens,
  payment,
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "default",
  triggerClassName,
}: {
  employees: EmployeeOption[];
  tokens: TokenOption[];
  payment?: SalaryPaymentRecord;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [extraEmployees, setExtraEmployees] = useState<EmployeeOption[]>([]);
  const isEdit = !!payment;
  const allEmployees = [...employees, ...extraEmployees.filter((ee) => !employees.some((e) => e.id === ee.id))];

  const form = useForm<SalaryPaymentFormInput, unknown, SalaryPaymentFormValues>({
    resolver: zodResolver(salaryPaymentFormSchema),
    defaultValues: payment ?? {
      employee_id: "",
      payment_period_month: previousMonth(new Date()).month,
      payment_period_year: previousMonth(new Date()).year,
      payment_type: "SALARY",
      other_type_label: "",
      gross_salary: 0,
      it_deduction_amount: 0,
      pay_mode: "TREASURY",
      treasury_token_number: "",
      token_generated_date: "",
      actual_payment_date: "",
      remarks: "",
    },
  });

  const employeeId = form.watch("employee_id");
  const paymentType = form.watch("payment_type");
  const payMode = form.watch("pay_mode");
  const periodYear = form.watch("payment_period_year");
  const [yearManualMode, setYearManualMode] = useState(
    !!payment && !YEAR_PRESETS.includes(payment.payment_period_year),
  );
  const selectedEmployee = allEmployees.find((e) => e.id === employeeId);
  const grossSalary = Number(form.watch("gross_salary")) || 0;
  const itDeduction = Number(form.watch("it_deduction_amount")) || 0;
  const netPayable = grossSalary - itDeduction;

  async function onSubmit(values: SalaryPaymentFormValues) {
    setServerError(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, String(value ?? "")));

    const result = isEdit
      ? await updateSalaryPayment(payment.id, { error: null }, formData)
      : await createSalaryPayment({ error: null }, formData);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    setOpen(false);
    form.reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setServerError(null);
      }}
    >
      <DialogTrigger
        className={cn(buttonVariants({ variant: triggerVariant, size: triggerSize }), triggerClassName)}
        render={<button type="button" />}
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] sm:max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Payment" : "Add Payment"}</DialogTitle>
          <DialogDescription>Select an employee - their PAN is picked up automatically.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Employee</FormLabel>
                  <FormControl>
                    <PartyCombobox
                      items={allEmployees.map((e) => ({ id: e.id, label: e.employee_name, sublabel: e.pan_number }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Search employee by name..."
                      addNewLabel="Add new employee"
                      renderAddDialog={({ open: addOpen, onOpenChange, onCreated }) => (
                        <EmployeeFormDialog
                          triggerLabel="Add new employee"
                          open={addOpen}
                          onOpenChange={onOpenChange}
                          hideTrigger
                          submitLabel="Save & Close"
                          onCreated={(created) => {
                            setExtraEmployees((prev) => [...prev, { id: created.id, employee_name: created.employee_name, pan_number: "" }]);
                            onCreated(created.id);
                          }}
                        />
                      )}
                    />
                  </FormControl>
                  {selectedEmployee ? (
                    <p className="text-xs text-muted-foreground">PAN: {selectedEmployee.pan_number}</p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_period_month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment For Month</FormLabel>
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{(v: string) => MONTHS.find((m) => m.value === Number(v))?.label}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
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
              name="payment_period_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment For Year</FormLabel>
                  <div className="flex gap-2">
                    <Select
                      value={yearManualMode ? "OTHER" : String(field.value)}
                      onValueChange={(v) => {
                        if (v === "OTHER") {
                          setYearManualMode(true);
                        } else {
                          setYearManualMode(false);
                          field.onChange(Number(v));
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue>{(v: string) => (v === "OTHER" ? "Other" : v)}</SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {YEAR_PRESETS.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {yearManualMode ? (
                      <Input
                        type="number"
                        className="w-28"
                        value={typeof periodYear === "number" ? periodYear : String(periodYear ?? "")}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    ) : null}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{(v: string) => PAYMENT_TYPE_LABELS[v as (typeof PAYMENT_TYPES)[number]]}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {PAYMENT_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {paymentType === "OTHER" ? (
              <FormField
                control={form.control}
                name="other_type_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Bonus" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="gross_salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gross Salary (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...numericProps(field, (v) => form.setValue("gross_salary", v as never))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="it_deduction_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IT Deduction Amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...numericProps(field, (v) => form.setValue("it_deduction_amount", v as never))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between rounded-lg bg-lime-600 px-3 py-2 text-white sm:col-span-2">
              <span className="text-sm font-semibold">Net Payable</span>
              <span className="text-base font-bold">{formatINR(netPayable)}</span>
            </div>

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

            {payMode === "OTHER_THAN_TREASURY" ? (
              <FormField
                control={form.control}
                name="actual_payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="treasury_token_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treasury Token Number</FormLabel>
                      <FormControl>
                        <TokenCombobox
                          tokens={tokens}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onSelectExisting={(t) => {
                            field.onChange(t.token_number);
                            if (t.token_generated_date) {
                              form.setValue("token_generated_date", t.token_generated_date as never);
                            }
                          }}
                          placeholder="Type or pick a previous token"
                        />
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
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {payMode === "TREASURY" ? (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                {isEdit && payment?.actual_payment_date
                  ? `Reconciled treasury payment date: ${payment.actual_payment_date}. Enter a correction via Treasury Reconciliation.`
                  : "The actual treasury payment date is entered later via Treasury Reconciliation, once the monthly reconciliation statement confirms it."}
              </p>
            ) : null}

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? <p className="text-sm text-destructive sm:col-span-2">{serverError}</p> : null}

            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
