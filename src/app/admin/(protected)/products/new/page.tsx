import type { Metadata } from "next";
import { createProduct } from "@/actions/admin/products";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { loadSettings, loadVendors } from "@/lib/admin/db";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const [vendors, settings] = await Promise.all([loadVendors(), loadSettings()]);
  return (
    <>
      <PageHeader title="Add product" description="New products start as Candidates until reviewed." />
      <ProductForm action={createProduct} vendors={vendors.map((v) => v.name)} policy={settings.policy} submitLabel="Add product" />
    </>
  );
}
