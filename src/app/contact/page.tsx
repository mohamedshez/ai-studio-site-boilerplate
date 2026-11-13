import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <h1>Contact us</h1>
      <p>Choose a topic so your message reaches the right team.</p>
      <ContactForm />
    </>
  );
}
