/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces .next/standalone with a self-contained server.js for the container.
  output: "standalone",

  // Example redirects from an old site structure. Replace with real ones.
  async redirects() {
    return [
      { source: "/company/contact-us", destination: "/contact", permanent: true },
      { source: "/company/about-us", destination: "/about", permanent: true },
    ];
  },
};

export default nextConfig;
