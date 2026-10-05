import type { Metadata } from "next";
import { PackageForm, SettingsForm } from "@/components/admin/settings-form";
import { Card, PageHeader } from "@/components/admin/ui";
import { loadPackageProfiles, loadSettings } from "@/lib/admin/db";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [settings, packages] = await Promise.all([loadSettings(), loadPackageProfiles()]);
  return (
    <>
      <PageHeader title="Settings" description="Every assumption behind box costs and margins lives here. Change it once; every page uses it." />
      <Card title="Package profiles (box sizes)" className="mb-4">
        <p className="mb-3 text-xs text-muted-foreground">
          Dimensions matter for USPS Ground Advantage Cubic. The default package is used for new shipments and cost estimates.
        </p>
        <div className="space-y-3">
          {packages.map((p) => (
            <PackageForm key={p.id} pkg={p} />
          ))}
          <div className="border-t pt-3">
            <PackageForm />
          </div>
        </div>
      </Card>
      <SettingsForm settings={settings} />
    </>
  );
}
