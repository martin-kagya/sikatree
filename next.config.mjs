/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep pg as a runtime package so Cloudflare Hyperdrive can supply the
  // connection string without the driver being rewritten by the bundler.
  serverExternalPackages: ['pg'],
  experimental: {
    // Static generation has intermittently lost a client reference in CI when
    // page workers run in parallel. One worker keeps the client manifest and
    // the prerender pass in sync; the build is still comfortably fast.
    cpus: 1,
  },
};

export default nextConfig;
