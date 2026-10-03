import { canDeliverEmail, isEmailConfigured } from "@/lib/integrations/email";
import { isGoogleCalendarConfigured, isGoogleLoginConfigured } from "@/lib/integrations/google-calendar";

export function integrationStatus() {
  return {
    database: process.env.DATABASE_URL ? ("hosted" as const) : ("local" as const),
    googleLogin: isGoogleLoginConfigured(),
    googleCalendar: isGoogleCalendarConfigured(),
    email: isEmailConfigured(),
    emailDeliverable: canDeliverEmail(),
  };
}
