"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBranding, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function BrandingForm({
  branding,
}: {
  branding: { company_name: string; tagline: string; contact_email: string; contact_phone: string };
}) {
  const [state, formAction, isPending] = useActionState(updateBranding, initialState);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Login Page &amp; In-App Branding</CardTitle>
        <CardDescription>
          Shown at the bottom of the login page, and to every signed-in user (any department, any role) so they can
          contact your company directly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name</Label>
            <Input id="company_name" name="company_name" defaultValue={branding.company_name} required maxLength={150} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tagline">Tagline (e.g. &quot;Designed and developed by ...&quot;)</Label>
            <Input id="tagline" name="tagline" defaultValue={branding.tagline} required maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input id="contact_email" name="contact_email" type="email" defaultValue={branding.contact_email} maxLength={150} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact Mobile</Label>
            <Input id="contact_phone" name="contact_phone" defaultValue={branding.contact_phone} maxLength={20} />
          </div>

          {state.error ? <p className="text-sm text-destructive sm:col-span-2">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-600 sm:col-span-2">Saved.</p> : null}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
