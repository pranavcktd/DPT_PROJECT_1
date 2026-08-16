"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatEnumLabel } from "@/lib/utils";
import {
  PERFORMANCE_RATINGS,
  workExperienceCertificateSchema,
  type WorkExperienceCertificateInput,
  type WorkExperienceCertificateValues,
} from "../schema";
import { issueWorkExperienceCertificate, updateWorkExperienceCertificate } from "../actions";

type WorkOption = {
  id: string;
  work_name: string;
  sanctioned_cost: number;
  expected_completion_date: string;
  actual_completion_date: string;
  suggestedContractorId?: string;
  executedValueSuggestion: number;
};
type ContractorOption = { id: string; firm_name: string };

function numericProps(field: { value: unknown }, onChange: (v: string) => void) {
  return {
    value: typeof field.value === "number" ? field.value : String(field.value ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
  };
}

export type CertificateInitialValues = WorkExperienceCertificateValues & { id: string };

export function CertificateForm({
  works,
  contractors,
  certificate,
}: {
  works: WorkOption[];
  contractors: ContractorOption[];
  certificate?: CertificateInitialValues;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!certificate;

  const form = useForm<WorkExperienceCertificateInput, unknown, WorkExperienceCertificateValues>({
    resolver: zodResolver(workExperienceCertificateSchema),
    defaultValues: certificate ?? {
      work_id: "",
      contractor_id: "",
      certificate_number: `WEC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      stated_completion_date: "",
      actual_completion_date: "",
      sanctioned_value: 0,
      executed_value: 0,
      performance_rating_label: "SATISFACTORY",
      performance_rating_score: undefined,
      remarks: "",
    },
  });

  const workId = form.watch("work_id");
  const selectedWork = works.find((w) => w.id === workId);

  useEffect(() => {
    // Edit mode starts with the certificate's own saved values - selecting a
    // different work order there shouldn't silently overwrite them.
    if (isEdit || !selectedWork) return;
    form.setValue("sanctioned_value", selectedWork.sanctioned_cost);
    form.setValue("executed_value", selectedWork.executedValueSuggestion);
    form.setValue("stated_completion_date", selectedWork.expected_completion_date);
    form.setValue("actual_completion_date", selectedWork.actual_completion_date);
    if (selectedWork.suggestedContractorId) {
      form.setValue("contractor_id", selectedWork.suggestedContractorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWork?.id, isEdit]);

  async function onSubmit(values: WorkExperienceCertificateValues) {
    setServerError(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, String(value ?? "")));

    const result = isEdit
      ? await updateWorkExperienceCertificate(certificate.id, { error: null }, formData)
      : await issueWorkExperienceCertificate({ error: null }, formData);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    router.push("/certificates");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Work Experience Certificate" : "Issue Work Experience Certificate"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Update the certificate's details below."
            : "Selecting a work order auto-fills the contractor and executed value from its payment history - all fields remain editable."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="work_id"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Work Order</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a work order">
                          {(v: string) => works.find((w) => w.id === v)?.work_name}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {works.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.work_name}
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
                <FormItem className="sm:col-span-2">
                  <FormLabel>Contractor</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a contractor">
                          {(v: string) => contractors.find((c) => c.id === v)?.firm_name}
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

            <FormField
              control={form.control}
              name="certificate_number"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Certificate Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stated_completion_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stated Completion Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="actual_completion_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual Completion Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sanctioned_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sanctioned Tender Value (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...numericProps(field, (v) => form.setValue("sanctioned_value", v as never))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="executed_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Final Executed Value (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...numericProps(field, (v) => form.setValue("executed_value", v as never))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="performance_rating_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Performance Rating</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{(v: string) => formatEnumLabel(v)}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PERFORMANCE_RATINGS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {formatEnumLabel(r)}
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
              name="performance_rating_score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating Score (out of 10, optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      {...numericProps(field, (v) => form.setValue("performance_rating_score", v as never))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? <p className="text-sm text-destructive sm:col-span-2">{serverError}</p> : null}

            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {form.formState.isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Issue Certificate"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
