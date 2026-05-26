// Generate public/favicon.ico from public/favicon.svg (run: pnpm gen:favicon).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, "..", "public");
const svg = readFileSync(join(pub, "favicon.svg"));

// Render a couple of sizes for a crisp multi-resolution .ico.
const pngs = [32, 48, 64].map((size) => {
  const r = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  return Buffer.from(r.render().asPng());
});

const ico = await pngToIco(pngs);
writeFileSync(join(pub, "favicon.ico"), ico);
console.log(`favicon.ico written (${ico.length} bytes)`);
