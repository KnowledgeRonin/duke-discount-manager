import * as fabric from "fabric";
import { parseSVGToGroupNode } from "./src/lib/canvas/svgParser";

const svg = `<svg width="100" height="100"><rect x="10" y="10" width="80" height="80" fill="red"/></svg>`;

async function main() {
  console.log("Starting parse...");
  const res = await parseSVGToGroupNode(svg);
  console.log("Parsed result objects length:", res.objects?.length);
  console.log("Parsed result JSON:", JSON.stringify(res, null, 2));
}

main().catch(console.error);
