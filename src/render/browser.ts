import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { chromium, type Browser } from "playwright-core";
import type { Progress } from "./voice.js";

const require = createRequire(import.meta.url);

/** Downloads Playwright's small headless Chromium (about 100 MB, one time only). */
export async function installBrowser(onProgress?: Progress): Promise<void> {
  onProgress?.("Downloading the headless browser (one time only)…");
  const cli = join(dirname(require.resolve("playwright-core/package.json")), "cli.js");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [cli, "install", "chromium", "--only-shell", "--no-progress"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let errors = "";
    child.stderr.on("data", (chunk) => (errors += chunk));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(errors.trim() || `exit code ${code}`))));
  });
}

/**
 * Chrome flags that keep rendering fully offline. Hostnames resolve to nothing and
 * there's no proxy, so the browser can't open a connection anywhere, and its
 * background services (updates, sync, sign-in, translate) stay off. Our own page
 * still loads, because Playwright serves it before any network step.
 */
const OFFLINE_ARGS = [
  "--no-proxy-server",
  "--host-resolver-rules=MAP * ~NOTFOUND",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-sync",
  "--disable-domain-reliability",
  "--no-pings",
  "--disable-features=Translate,OptimizationHints,MediaRouter,AutofillServerCommunication",
];

const isMissingBrowser = (error: unknown) => error instanceof Error && /Executable doesn't exist/i.test(error.message);

/**
 * Starts a headless browser. Order: BEZEL_FILM_CHROME if set, then Playwright's own
 * Chromium (downloaded automatically the first time), then Chrome if it's installed.
 */
export async function launchBrowser(onProgress?: Progress): Promise<Browser> {
  const executablePath = process.env.BEZEL_FILM_CHROME;
  if (executablePath) return chromium.launch({ executablePath, args: OFFLINE_ARGS });

  try {
    return await chromium.launch({ args: OFFLINE_ARGS });
  } catch (error) {
    if (!isMissingBrowser(error)) throw error;
  }

  try {
    await installBrowser(onProgress);
    return await chromium.launch({ args: OFFLINE_ARGS });
  } catch (installError) {
    try {
      return await chromium.launch({ channel: "chrome", args: OFFLINE_ARGS });
    } catch {
      const reason = installError instanceof Error ? installError.message : String(installError);
      throw new Error(
        `Couldn't download the headless browser Bezel Film draws with (${reason}). Check your internet connection and run "npx bezel-film setup", or install Google Chrome.`,
      );
    }
  }
}
