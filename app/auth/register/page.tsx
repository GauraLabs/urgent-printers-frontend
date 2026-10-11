import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { safeRedirect } from "@/lib/safeRedirect";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Backend SMS is off in production, so phone verification only works through
// the Firebase flow on the login page, which also creates new accounts.
export default async function RegisterRedirect({ searchParams }: PageProps) {
  const redirectTo = (await searchParams).redirect;
  const raw = Array.isArray(redirectTo) ? redirectTo[0] : redirectTo;
  const target = safeRedirect(raw, "");
  redirect(target ? `${ROUTES.login}?redirect=${encodeURIComponent(target)}` : ROUTES.login);
}
