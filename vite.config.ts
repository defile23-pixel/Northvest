// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // The base config defaults Nitro's build target to Cloudflare. Adding the plugin
  // again here with preset: "vercel" overrides that so `vite build` outputs in the
  // format Vercel's TanStack Start framework detection expects. Without this, routes
  // beyond the homepage 404 on Vercel even though the build succeeds.
  vite: {
    plugins: [
      nitro({
        preset: "vercel",
      }),
    ],
  },
});
