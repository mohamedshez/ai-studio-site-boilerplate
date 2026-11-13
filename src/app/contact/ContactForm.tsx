"use client";

import { useState, type FormEvent } from "react";
import { TOPICS, type FieldErrors } from "@/lib/contact";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; dryRunInbox?: string }
  | { kind: "failed"; message: string };

export default function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));

    setStatus({ kind: "sending" });
    setErrors({});

    try {
      // Built from the origin because a relative address fails when the page was
      // opened with the sign-in in its address (https://user:password@host/...).
      const response = await fetch(new URL("/api/contact", window.location.origin), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        form.reset();
        setStatus({ kind: "sent", dryRunInbox: data.dryRun ? data.routedTo : undefined });
      } else if (response.status === 422 && data.errors) {
        setErrors(data.errors);
        setStatus({ kind: "failed", message: "Check the highlighted fields and try again." });
      } else {
        setStatus({ kind: "failed", message: data.error ?? "Something went wrong. Try again." });
      }
    } catch {
      setStatus({ kind: "failed", message: "Could not reach the server. Try again." });
    }
  }

  function describedBy(field: keyof FieldErrors) {
    return errors[field] ? `${field}-error` : undefined;
  }

  function fieldError(field: keyof FieldErrors) {
    return errors[field] ? (
      <p className="field-error" id={`${field}-error`}>
        {errors[field]}
      </p>
    ) : null;
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          maxLength={100}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("name")}
        />
        {fieldError("name")}
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy("email")}
        />
        {fieldError("email")}
      </div>

      <div className="field">
        <label htmlFor="topic">Topic</label>
        <select
          id="topic"
          name="topic"
          defaultValue="general"
          aria-invalid={Boolean(errors.topic)}
          aria-describedby={describedBy("topic")}
        >
          {Object.entries(TOPICS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {fieldError("topic")}
      </div>

      <div className="field">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          rows={6}
          maxLength={5000}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={describedBy("message")}
        />
        {fieldError("message")}
      </div>

      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" disabled={status.kind === "sending"}>
        {status.kind === "sending" ? "Sending…" : "Send message"}
      </button>

      <div aria-live="polite">
        {status.kind === "sent" && (
          <p className="notice">
            {status.dryRunInbox
              ? `Dry run: nothing was sent. This message would go to ${status.dryRunInbox}.`
              : "Thank you. Your message has been sent."}
          </p>
        )}
        {status.kind === "failed" && <p className="notice error">{status.message}</p>}
      </div>
    </form>
  );
}
