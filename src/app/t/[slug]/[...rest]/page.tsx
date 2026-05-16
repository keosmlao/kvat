import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

// /t/<slug>/<anything> → validates slug against the session, then bounces to
// the canonical /<anything> route. Lets users share deep links like
// /t/acme/invoices/abc123 without breaking when their session is on a
// different tenant (we redirect to /dashboard instead of leaking data).
export default async function TenantDeepLinkPage({
  params,
}: {
  params: Promise<{ slug: string; rest: string[] }>;
}) {
  const { slug, rest } = await params;
  const path = "/" + (rest ?? []).join("/");

  const session = await getSession();
  if (!session) {
    const target = `/t/${slug}${path}`;
    redirect(`/login?from=${encodeURIComponent(target)}`);
  }
  if (session.slug !== slug) redirect("/dashboard");
  redirect(path);
}
