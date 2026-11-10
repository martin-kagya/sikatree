/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // OpenNext Cloudflare builds from the standalone output.
  output: 'standalone',
  // Keep pg as a runtime package so Cloudflare Hyperdrive can supply the
  // connection string without the driver being rewritten by the bundler.
  serverExternalPackages: ['pg'],
  experimental: {
    // Item photos upload through a server action. The browser and the form
    // allow up to 5 photos of 10MB each (capped at 30MB total by the action),
    // so the default 1MB body limit rejects almost every phone photo.
    serverActions: {
      bodySizeLimit: '32mb',
    },
    // Static generation has intermittently lost a client reference in CI when
    // page workers run in parallel. One worker keeps the client manifest and
    // the prerender pass in sync; the build is still comfortably fast.
    cpus: 1,
  },
};

export default nextConfig;
