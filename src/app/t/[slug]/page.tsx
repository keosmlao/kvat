import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

// /t/<slug> → redirects to /dashboard for the matching tenant. If the user
// isn't logged in OR the slug doesn't match their session, bounce to /login.
// This route makes URLs of the form `https://smlao.la/t/acme` shareable —
// the canonical app still lives at /dashboard, /invoices, etc.
export default async function TenantRootPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?from=${encodeURIComponent(`/t/${slug}`)}`);
  if (session.slug !== slug) redirect("/dashboard");
  redirect("/dashboard");
}
