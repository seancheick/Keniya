import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateProduct } from "@/actions/admin/products";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { db, loadSettings, loadVendors, type ProductRow, type VersionRow } from "@/lib/admin/db";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, v, vendors, settings] = await Promise.all([
    db().from("products").select("*").eq("id", id).maybeSingle(),
    db().from("product_versions").select("*").eq("product_id", id).eq("is_current", true).maybeSingle(),
    loadVendors(),
    loadSettings(),
  ]);
  if (!p.data) notFound();
  const product = p.data as ProductRow;
  return (
    <>
      <PageHeader title={`Edit ${product.code}`} description={product.name} />
      <ProductForm
        action={updateProduct.bind(null, id)}
        product={product}
        version={(v.data as VersionRow) ?? undefined}
        vendorName={vendors.find((x) => x.id === product.default_vendor_id)?.name}
        vendors={vendors.map((x) => x.name)}
        policy={settings.policy}
        submitLabel="Save changes"
        editing
      />
    </>
  );
}
