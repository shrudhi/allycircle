import { canDeliverEmail } from "@/lib/integrations/email";

/** Only require inbox confirmation once Resend can actually deliver to anyone. */
export function emailVerificationRequired() {
  return process.env.NODE_ENV === "production" && canDeliverEmail();
}
