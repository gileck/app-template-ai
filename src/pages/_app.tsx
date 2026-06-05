import "@/client/styles/globals.css";
import "@/client/styles/project.css";  // Project-specific styles (ignored by template-sync)
import { AppShell } from "@/client/features/template/app-shell";

/**
 * Thin project shim. All app-root wiring (providers, router, boot gating,
 * offline init, app-root bridges) lives in the template-owned <AppShell>
 * (`src/client/features/template/app-shell`), so template features stay wired
 * end-to-end across template syncs without editing this file.
 *
 * Global CSS is imported here because Next.js only allows it from _app.
 *
 * To add project-wide context providers, pass `wrapProviders`:
 *   <AppShell wrapProviders={(children) => <MyProvider>{children}</MyProvider>} />
 */
export default function App() {
  return <AppShell />;
}
