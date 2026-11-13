import assert from "node:assert/strict";
import { test } from "node:test";
import { isSpam, resolveInbox, validateContact } from "./contact.ts";

const valid = {
  name: "Ada Example",
  email: "ada@example.com",
  topic: "sales",
  message: "I would like to know more.",
};

test("accepts a valid message and trims it", () => {
  const result = validateContact({ ...valid, name: "  Ada Example  " });
  assert.deepEqual(result, { ok: true, value: valid });
});

test("reports every missing field", () => {
  const result = validateContact({});
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.ok ? {} : result.errors).sort(), [
    "email",
    "message",
    "name",
    "topic",
  ]);
});

test("rejects a malformed email and an unknown topic", () => {
  const result = validateContact({ ...valid, email: "ada@example", topic: "constructor" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.email);
    assert.ok(result.errors.topic);
    assert.equal(result.errors.name, undefined);
  }
});

test("rejects a name with a line break, which could inject mail headers", () => {
  const result = validateContact({ ...valid, name: "Ada\r\nBcc: x@example.com" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.name);
});

test("routes a topic to its own inbox when one is set", () => {
  const env = { CONTACT_TO_GENERAL: "hello@example.com", CONTACT_TO_CAREERS: "careers@example.com" };
  assert.equal(resolveInbox("careers", env), "careers@example.com");
});

test("falls back to the general inbox, and to null when nothing is set", () => {
  assert.equal(
    resolveInbox("sales", { CONTACT_TO_GENERAL: "hello@example.com", CONTACT_TO_SALES: "" }),
    "hello@example.com",
  );
  assert.equal(resolveInbox("sales", {}), null);
});

test("treats a filled hidden field as spam", () => {
  assert.equal(isSpam({ ...valid, website: "http://spam.example.com" }), true);
  assert.equal(isSpam({ ...valid, website: "" }), false);
  assert.equal(isSpam(valid), false);
});
