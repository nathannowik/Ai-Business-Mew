import twilio from "twilio";
import nodemailer from "nodemailer";
import { getIntegrationConfig } from "../integrations/service.js";

export interface SendResult {
  sent: boolean;
  /** True when no integration was configured, so we only logged the message. */
  simulated: boolean;
  error?: string;
}

/**
 * Send an SMS via the org's Twilio integration. Falls back to "simulation"
 * (log only) when Twilio isn't connected, so the product is fully testable.
 */
export async function sendSms(
  organizationId: string,
  to: string,
  body: string,
): Promise<SendResult> {
  const config = await getIntegrationConfig(organizationId, "twilio");
  if (!config?.accountSid || !config.authToken || !config.phoneNumber) {
    console.log(`[sms:simulated] org=${organizationId} to=${to}: ${body}`);
    return { sent: false, simulated: true };
  }
  try {
    const client = twilio(config.accountSid, config.authToken);
    await client.messages.create({ from: config.phoneNumber, to, body });
    return { sent: true, simulated: false };
  } catch (err) {
    return { sent: false, simulated: false, error: (err as Error).message };
  }
}

/** Send an email via the org's SMTP integration, or simulate if not connected. */
export async function sendEmail(
  organizationId: string,
  to: string,
  subject: string,
  body: string,
): Promise<SendResult> {
  const config = await getIntegrationConfig(organizationId, "email");
  if (!config?.host || !config.user || !config.password || !config.fromEmail) {
    console.log(`[email:simulated] org=${organizationId} to=${to} subj="${subject}": ${body}`);
    return { sent: false, simulated: true };
  }
  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: Number(config.port || 587),
      secure: Number(config.port) === 465,
      auth: { user: config.user, pass: config.password },
    });
    await transport.sendMail({ from: config.fromEmail, to, subject, text: body });
    return { sent: true, simulated: false };
  } catch (err) {
    return { sent: false, simulated: false, error: (err as Error).message };
  }
}
