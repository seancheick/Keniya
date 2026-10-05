import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ScrollFx } from "@/components/fx/scroll-fx";
import { JsonLd } from "@/components/json-ld";
import { site } from "@/lib/site";

// Storefront chrome. Lives in the (site) group so /admin gets its own shell.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.name,
      url: site.url,
      logo: `${site.url}/icon.svg`,
      email: site.email,
      description: site.description,
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      name: site.name,
      url: site.url,
      publisher: { "@id": `${site.url}/#organization` },
    },
  ],
};

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <JsonLd data={organizationJsonLd} />
      <ScrollFx />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
