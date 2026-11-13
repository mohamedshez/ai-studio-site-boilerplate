import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <h1>Useful tools for small teams</h1>
      <p>
        Larkfield Labs is a fictional company. This site is a template that shows a marketing
        website with a development site, a production site and a contact form.
      </p>
      <p>
        <Link href="/contact" className="button">
          Get in touch
        </Link>
      </p>
    </>
  );
}
