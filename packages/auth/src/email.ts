import { env } from "@hay-fulbo/env/server";

type EmailMessage = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const invitationDeliveryMode =
  env.RESEND_API_KEY && env.EMAIL_FROM ? ("email" as const) : ("link" as const);

export const emailDeliveryConfigured = invitationDeliveryMode === "email";

async function sendEmail(message: EmailMessage) {
  if (!emailDeliveryConfigured) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      html: message.html,
      subject: message.subject,
      text: message.text,
      to: [message.to],
    }),
  });

  if (!response.ok) {
    throw new Error(`Email delivery failed with status ${response.status}`);
  }
}

export async function sendVerificationEmail(input: {
  url: string;
  user: { email: string; name: string };
}) {
  const name = escapeHtml(input.user.name);
  const url = escapeHtml(input.url);
  await sendEmail({
    to: input.user.email,
    subject: "Verificá tu email en Hay Fulbo",
    text: `Hola ${input.user.name}. Verificá tu email: ${input.url}`,
    html: `<p>Hola ${name}.</p><p><a href="${url}">Verificá tu email en Hay Fulbo</a>.</p>`,
  });
}

export async function sendInvitationEmail(input: {
  email: string;
  id: string;
  organization: { name: string };
}) {
  const url = new URL(`/invitaciones/${encodeURIComponent(input.id)}`, env.BETTER_AUTH_URL).href;
  const groupName = escapeHtml(input.organization.name);
  await sendEmail({
    to: input.email,
    subject: `Te invitaron a ${input.organization.name}`,
    text: `Sumate al grupo ${input.organization.name} en Hay Fulbo: ${url}`,
    html: `<p>Te invitaron a <strong>${groupName}</strong>.</p><p><a href="${escapeHtml(url)}">Aceptar invitación</a>.</p>`,
  });
}
