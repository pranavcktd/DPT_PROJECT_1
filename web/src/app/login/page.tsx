import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBranding } from "@/lib/branding";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const branding = await getBranding();
  const year = new Date().getFullYear();
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Government Contract &amp; Payment Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
      <div className="space-y-1 text-center text-xs text-muted-foreground">
        <p>{branding.tagline}</p>
        {branding.contactEmail || branding.contactPhone ? (
          <p>
            {branding.contactEmail ? (
              <a href={`mailto:${branding.contactEmail}`} className="underline underline-offset-4">
                {branding.contactEmail}
              </a>
            ) : null}
            {branding.contactEmail && branding.contactPhone ? " · " : null}
            {branding.contactPhone ? (
              <a href={`tel:${branding.contactPhone.replace(/\s+/g, "")}`} className="underline underline-offset-4">
                {branding.contactPhone}
              </a>
            ) : null}
          </p>
        ) : null}
        <p>© {year} {branding.companyName}. All rights reserved.</p>
      </div>
    </div>
  );
}
