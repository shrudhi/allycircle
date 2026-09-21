import { appUrl } from "@/lib/integrations/app-url";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  body: string;
  href?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false as const, reason: "not_configured" as const };
  const from = process.env.EMAIL_FROM || "AllyCircle <onboarding@resend.dev>";
  const link = input.href?.startsWith("http") ? input.href : `${appUrl()}${input.href || ""}`;
  const html = `
    <div style="font-family:Georgia,serif;background:#111;color:#fff;padding:32px">
      <p style="color:#d4af37;letter-spacing:0.2em;text-transform:uppercase;font-size:12px">AllyCircle</p>
      <h1 style="font-size:22px">${escapeHtml(input.subject)}</h1>
      <p style="color:#cfcfcf;line-height:1.6">${escapeHtml(input.body)}</p>
      ${input.href ? `<p><a href="${escapeHtml(link)}" style="color:#d4af37">Open in AllyCircle</a></p>` : ""}
    </div>
  `;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html,
      text: `${input.body}${input.href ? `\n\n${link}` : ""}`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return { sent: true as const };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
