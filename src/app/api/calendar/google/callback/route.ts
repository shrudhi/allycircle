import { NextResponse } from "next/server";
import { completeGoogleCalendarOAuth, parseGoogleCalendarState } from "@/lib/integrations/google-calendar";
import { appUrl } from "@/lib/integrations/app-url";
import { track } from "@/lib/analytics/track";
import { analyticsEvents } from "@/lib/analytics/taxonomy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(`${appUrl()}/settings?calendar=denied#calendar`);
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(`${appUrl()}/settings?calendar=missing#calendar`);
  }
  try {
    const userId = parseGoogleCalendarState(state);
    await completeGoogleCalendarOAuth(userId, code);
    await track(analyticsEvents.calendar_connected, { userId });
    return NextResponse.redirect(`${appUrl()}/settings?calendar=connected#calendar`);
  } catch {
    return NextResponse.redirect(`${appUrl()}/settings?calendar=failed#calendar`);
  }
}
