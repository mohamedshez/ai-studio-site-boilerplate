import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

// Pages read SITE_ENV at run time, so one image serves both sites.
// Without this the value would be frozen when the image is built.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Larkfield Labs", template: "%s | Larkfield Labs" },
  description: "Larkfield Labs is a fictional company used to demonstrate this site template.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const isProduction = process.env.SITE_ENV === "production";

  return (
    <html lang="en-GB">
      <body>
        {!isProduction && (
          <p className="dev-banner" role="status">
            Development site. Not for public use.
          </p>
        )}
        <header className="site-header">
          <Link href="/" className="brand">
            Larkfield Labs
          </Link>
          <nav aria-label="Main">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <p>© {new Date().getFullYear()} Larkfield Labs. A fictional company.</p>
        </footer>
      </body>
    </html>
  );
}
