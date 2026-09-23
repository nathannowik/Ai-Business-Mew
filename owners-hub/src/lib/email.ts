import nodemailer from "nodemailer";

export const APP_NAME = process.env.APP_NAME || "Owners Hub";
export const APP_URL = (process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "");

let transporter: ReturnType<typeof nodemailer.createTransport> | null | undefined;

function getTransporter() {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  transporter = host
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : null;
  return transporter;
}

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const t = getTransporter();
  if (!t) {
    console.log(`[email:not-configured] to=${to} subject="${subject}"\n${text}\n`);
    return false;
  }
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM || `${APP_NAME} <${process.env.SMTP_USER}>`, to, subject, html, text });
    return true;
  } catch (err) {
    console.error(`[email] failed to send to ${to}:`, err);
    return false;
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Minimal, mobile-friendly email wrapper. */
export function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f5f2;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1917">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="font-size:13px;color:#78716c;margin-bottom:8px">${escapeHtml(APP_NAME)}</div>
<div style="background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:20px">
<h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(title)}</h1>
${bodyHtml}
</div></div></body></html>`;
}

export function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:16px;background:#1c1917;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px">${escapeHtml(label)}</a>`;
}
