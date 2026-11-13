// Pure rules for the contact form: topics, validation and inbox routing.
// No framework imports, so this runs under Node's built-in test runner.

export const TOPICS = {
  general: "General enquiry",
  sales: "Sales",
  careers: "Careers",
  support: "Support",
} as const;

export type Topic = keyof typeof TOPICS;

export type ContactMessage = {
  name: string;
  email: string;
  topic: Topic;
  message: string;
};

export type FieldErrors = Partial<Record<keyof ContactMessage, string>>;

export type ValidationResult =
  | { ok: true; value: ContactMessage }
  | { ok: false; errors: FieldErrors };

const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isTopic(value: unknown): value is Topic {
  return typeof value === "string" && Object.hasOwn(TOPICS, value);
}

export function validateContact(input: unknown): ValidationResult {
  const data = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const name = text(data.name);
  if (!name) errors.name = "Enter your name.";
  else if (name.length > 100) errors.name = "Name must be 100 characters or fewer.";
  else if (/[\r\n]/.test(name)) errors.name = "Name must be on one line.";

  const email = text(data.email);
  if (!email) errors.email = "Enter your email address.";
  else if (email.length > 254 || !EMAIL.test(email)) errors.email = "Enter a valid email address.";

  const topic = data.topic;
  if (!isTopic(topic)) errors.topic = "Choose a topic.";

  const message = text(data.message);
  if (!message) errors.message = "Enter a message.";
  else if (message.length < 10) errors.message = "Message must be at least 10 characters.";
  else if (message.length > 5000) errors.message = "Message must be 5,000 characters or fewer.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, email, topic: topic as Topic, message } };
}

// The hidden "website" field is invisible to people. Anything in it means a bot.
export function isSpam(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;
  return text((input as Record<string, unknown>).website) !== "";
}

type Env = Record<string, string | undefined>;

// Each topic has its own optional inbox setting and falls back to the general one.
// Returns null when no inbox is configured at all.
export function resolveInbox(topic: Topic, env: Env): string | null {
  const own = text(env[`CONTACT_TO_${topic.toUpperCase()}`]);
  const general = text(env.CONTACT_TO_GENERAL);
  return own || general || null;
}
