import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { googleCalendarAuthUrl, isGoogleCalendarConfigured } from "@/lib/integrations/google-calendar";
import { appUrl } from "@/lib/integrations/app-url";

export async function GET() {
  const current = await getSessionUser();
  if (!current) {
    return NextResponse.redirect(`${appUrl()}/login`);
  }
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(`${appUrl()}/settings?calendar=not_configured#calendar`);
  }
  return NextResponse.redirect(googleCalendarAuthUrl(current.id));
}
