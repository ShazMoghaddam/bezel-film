import { readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

/**
 * Renders docs/banner.html into the README banner (docs/banner.png, 2560 x 800) and the
 * GitHub social preview (docs/social-preview.png, 1280 x 640). Uses the same fonts, colours
 * and Bezel Charts as the films. Run with `npm run banner` after `npx bezel-film setup`.
 */
const root = fileURLToPath(new URL("..", import.meta.url));
const modules = `${root}node_modules`;
const template = (await readFile(`${root}docs/banner.html`, "utf8"))
  .replaceAll("FONTS/", `file://${modules}/@fontsource/`)
  .replace("CHARTS", `file://${modules}/bezel-charts/dist/bezel-charts.iife.js`);

const browser = await chromium.launch({
  executablePath: process.env.BEZEL_FILM_CHROME,
  args: ["--allow-file-access-from-files"],
});
try {
  for (const [mode, width, height, scale, out] of [
    ["social", 1280, 640, 1, "social-preview.png"],
    ["banner", 1280, 400, 2, "banner.png"],
  ] as const) {
    const page = `${root}docs/.banner-${mode}.html`;
    await writeFile(page, template.replace("MODE", mode));
    const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    await tab.goto(`file://${page}`);
    // Wait for the fonts and for every chart to draw (in-page code, passed as text).
    await tab.evaluate("document.fonts.ready");
    await tab.waitForFunction('[...document.querySelectorAll("bezel-chart")].every((el) => el.shadowRoot?.querySelector("svg"))');
    await tab.screenshot({ path: `${root}docs/${out}` });
    await tab.close();
    await rm(page);
    console.log(`✓ docs/${out}`);
  }
} finally {
  await browser.close();
}
