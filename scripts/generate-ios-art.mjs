import sharp from "sharp";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const assets = new URL("../ios/App/App/Assets.xcassets/", import.meta.url);
const mark = await readFile(
  new URL("../assets/bridge-mark.svg", import.meta.url),
  "utf8",
);
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#172f43"/><svg x="160" y="160" width="704" height="704" viewBox="0 0 32 32">${mark
  .split(">")
  .slice(1)
  .join(">")
  .replace(/<\/svg>\s*$/, "")}</svg></svg>`;
await sharp(Buffer.from(icon))
  .flatten({ background: "#172f43" })
  .removeAlpha()
  .png()
  .toFile(new URL("AppIcon.appiconset/AppIcon-512@2x.png", assets).pathname);
await mkdir(new URL("BridgeMark.imageset/", assets), { recursive: true });
await writeFile(new URL("BridgeMark.imageset/bridge-mark.svg", assets), mark);
await writeFile(
  new URL("BridgeMark.imageset/Contents.json", assets),
  JSON.stringify(
    {
      images: [{ filename: "bridge-mark.svg", idiom: "universal" }],
      info: { author: "xcode", version: 1 },
      properties: { "preserves-vector-representation": true },
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Generated the opaque 1024px app icon and vector launch mark from assets/bridge-mark.svg.",
);
