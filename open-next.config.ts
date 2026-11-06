import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal OpenNext Cloudflare config. No R2 incremental cache is configured;
// the app is mostly force-dynamic so Next.js ISR caching is not relied on.
export default defineCloudflareConfig({});
