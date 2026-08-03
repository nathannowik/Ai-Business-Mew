import { env } from "../env.js";

export interface SendEmailResult {
  sent: boolean;
  simulated: boolean;
  error?: string;
}

/**
 * Send a transactional (system) email via Resend. Falls back to logging when no
 * provider is configured, so the whole flow works in dev/simulation.
 */
export async function sendSystemEmail(
  to: string,
  subject: string,
  html: string,
): Promise<SendEmailResult> {
  if (!env.email.enabled) {
    console.log(`[email:simulated] to=${to} subject="${subject}"`);
    return { sent: false, simulated: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.email.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.email.from, to, subject, html }),
    });
    if (!res.ok) return { sent: false, simulated: false, error: await res.text() };
    return { sent: true, simulated: false };
  } catch (err) {
    return { sent: false, simulated: false, error: (err as Error).message };
  }
}

/** Minimal branded email wrapper. */
export function emailLayout(heading: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:16px">Mew AI</div>
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 12px">${heading}</h1>
    <div style="font-size:14px;line-height:1.6;color:#475569">${bodyHtml}</div>
    ${
      cta
        ? `<div style="margin:24px 0"><a href="${cta.url}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">${cta.label}</a></div>
           <div style="font-size:12px;color:#94a3b8;word-break:break-all">Or paste this link: ${cta.url}</div>`
        : ""
    }
    <div style="margin-top:28px;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px">Mew AI · This is an automated message.</div>
  </div>`;
}
