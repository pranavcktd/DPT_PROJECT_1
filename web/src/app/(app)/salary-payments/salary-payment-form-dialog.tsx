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
import { PAY_MODES, PAYMENT_TYPES, salaryPaymentFormSchema, type SalaryPaymentFormInput, type SalaryPaymentFormValues } from "./schema";
import { createSalaryPayment, updateSalaryPayment } from "./actions";

type EmployeeOption = { id: string; employee_name: string; pan_number: string };
type SalaryPaymentRecord = SalaryPaymentFormValues & { id: string };

function numericProps(field: { value: unknown }, onChange: (v: string) => void) {
  return {
    value: typeof field.value === "number" ? field.value : String(field.value ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
  };
}

export function SalaryPaymentFormDialog({
  employees,
  payment,
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "default",
  triggerClassName,
}: {
  employees: EmployeeOption[];
  payment?: SalaryPaymentRecord;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!payment;

  const form = useForm<SalaryPaymentFormInput, unknown, SalaryPaymentFormValues>({
    resolver: zodResolver(salaryPaymentFormSchema),
    defaultValues: payment ?? {
      employee_id: "",
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
  const selectedEmployee = employees.find((e) => e.id === employeeId);
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
          <DialogTitle>{isEdit ? "Edit Salary Payment" : "New Salary Payment"}</DialogTitle>
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an employee">
                          {(v: string) => employees.find((e) => e.id === v)?.employee_name}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.employee_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedEmployee ? (
                    <p className="text-xs text-muted-foreground">PAN: {selectedEmployee.pan_number}</p>
                  ) : null}
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
                        <SelectValue>{(v: string) => formatEnumLabel(v)}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {formatEnumLabel(t)}
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
                {form.formState.isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
