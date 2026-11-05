/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Static generation has intermittently lost a client reference in CI when
    // page workers run in parallel. One worker keeps the client manifest and
    // the prerender pass in sync; the build is still comfortably fast.
    cpus: 1,
  },
};

export default nextConfig;
