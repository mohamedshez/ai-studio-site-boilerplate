import nodemailer from "nodemailer";
import { TOPICS, isSpam, resolveInbox, validateContact } from "@/lib/contact";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Request body must be JSON." }, { status: 400 });
  }

  // Bots that fill the hidden field get a normal-looking answer and nothing is sent.
  if (isSpam(body)) return Response.json({ ok: true });

  const result = validateContact(body);
  if (!result.ok) {
    return Response.json({ ok: false, errors: result.errors }, { status: 422 });
  }

  const { name, email, topic, message } = result.value;
  const to = resolveInbox(topic, process.env);
  if (!to) {
    console.error("contact: no inbox configured (set CONTACT_TO_GENERAL)");
    return Response.json({ ok: false, error: "The form is not set up yet." }, { status: 500 });
  }

  // Dry-run mode: with no mail server configured, report where it would have gone.
  if (!process.env.SMTP_HOST) {
    return Response.json({ ok: true, dryRun: true, routedTo: to });
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" }
      : undefined,
  });

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      replyTo: { name, address: email },
      subject: `Website enquiry: ${TOPICS[topic]}`,
      text: `From: ${name} <${email}>\nTopic: ${TOPICS[topic]}\n\n${message}\n`,
    });
  } catch (error) {
    console.error("contact: send failed:", error instanceof Error ? error.message : error);
    return Response.json(
      { ok: false, error: "We could not send your message. Please try again later." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
