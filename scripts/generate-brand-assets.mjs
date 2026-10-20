import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

async function main() {
  console.log("Generating brand assets from public/cat-logo.svg...");

  let svg = fs.readFileSync("public/cat-logo.svg", "utf-8");

  // Remove any solid background path if present (line 3 with fill="#FEFEFD")
  const bgRegex = /<path\s+d="M0\s+0\s+C281\.16\s+0\s+562\.32\s+0\s+852\s+0[^"]*"\s+fill="#FEFEFD"[^>]*\/>\r?\n?/;
  if (bgRegex.test(svg)) {
    console.log("Removing outer background rectangle path from cat-logo.svg...");
    svg = svg.replace(bgRegex, "");
    fs.writeFileSync("public/cat-logo.svg", svg, "utf-8");
    console.log("Saved transparent public/cat-logo.svg");
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });

  // Render SVG centered with 8% quiet zone padding
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            width: 512px;
            height: 512px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
          }
          svg {
            width: 86%;
            height: 86%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        ${svg}
      </body>
    </html>
  `);

  const masterPngPath = "scripts/dev/cat-master-512.png";
  await page.screenshot({ path: masterPngPath, omitBackground: true });
  await browser.close();
  console.log(`Rendered master 512x512 PNG to ${masterPngPath}`);

  // Now use Python Pillow to create multi-resolution ICO and high-res PNGs
  const pyScript = `
from PIL import Image
import os

master = Image.open("${masterPngPath.replace(/\\/g, "/")}")
print("Master PNG mode:", master.mode, "size:", master.size)

# 1. Save high-res brand icon
os.makedirs("public/images", exist_ok=True)
icon_512 = master.copy()
icon_512.save("public/images/cat-my-v12-icon.png", format="PNG", optimize=True)
print("Saved public/images/cat-my-v12-icon.png (512x512)")

# 2. Save favicon.png (256x256)
icon_256 = master.resize((256, 256), Image.Resampling.LANCZOS)
icon_256.save("public/favicon.png", format="PNG", optimize=True)
print("Saved public/favicon.png (256x256)")

# 3. Save multi-resolution favicon.ico
sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
master.save("public/favicon.ico", format="ICO", sizes=sizes)
print("Saved public/favicon.ico with multi-resolution sizes:", sizes)
`;

  fs.writeFileSync("scripts/dev/build-icons.py", pyScript, "utf-8");
  execSync("python scripts/dev/build-icons.py", { stdio: "inherit" });
  console.log("All brand assets generated successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
