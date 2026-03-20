import * as fabric from "fabric";
import { loadFromFabricJSON } from "./parser";
import type { GroupNode } from "./types";

const WEIGHT_KEYWORDS: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
  extra: 800,
};

const FONT_FAMILY_EXCEPTIONS: Record<string, string> = {
  BigShouldersDisplay: "Big Shoulders Display",
  OpenSans: "Open Sans",
  ComicNeue: "Comic Neue",
};

export const getFontConfig = (fontName: string, originalWeight: string | number) => {
  if (!fontName) return { family: "Poppins", weight: "normal" };

  if (
    originalWeight &&
    originalWeight !== "normal" &&
    !isNaN(Number(originalWeight))
  ) {
    let cleanFamily = fontName.split("-")[0].trim();
    if (FONT_FAMILY_EXCEPTIONS[cleanFamily])
      cleanFamily = FONT_FAMILY_EXCEPTIONS[cleanFamily];
    return { family: cleanFamily, weight: originalWeight };
  }

  let detectedWeight: string | number = "normal";
  let familyParts: string[] = [];

  const normalizedName = fontName.replace(/-/g, " ");
  const nameParts = normalizedName.split(" ");

  nameParts.forEach((part) => {
    const lowerPart = part.toLowerCase();
    if (WEIGHT_KEYWORDS[lowerPart]) {
      detectedWeight = WEIGHT_KEYWORDS[lowerPart];
    } else {
      familyParts.push(part);
    }
  });

  let finalFamily = familyParts.join(" ");
  const compressedName = finalFamily.replace(/\s+/g, "");
  if (FONT_FAMILY_EXCEPTIONS[compressedName]) {
    finalFamily = FONT_FAMILY_EXCEPTIONS[compressedName];
  }

  return { family: finalFamily, weight: detectedWeight };
};

export const collapseTspans = (svgString: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");

  doc.querySelectorAll("text").forEach((textEl) => {
    const allTspans = Array.from(textEl.querySelectorAll("tspan"));

    // Leaf tspans only (no descendant tspans)
    const leafTspans = allTspans.filter(
      (ts) => ts.querySelectorAll("tspan").length === 0
    );

    if (leafTspans.length === 0) return;

    // Group by effective Y (walk up the tree to find the y attribute)
    const lines = new Map<number, Element[]>();
    leafTspans.forEach((ts) => {
      let effectiveY = 0;
      let node: Element | null = ts;
      while (node && node !== textEl) {
        const yAttr = node.getAttribute("y");
        if (yAttr !== null) {
          effectiveY = parseFloat(yAttr);
          break;
        }
        node = node.parentElement;
      }
      if (!lines.has(effectiveY)) lines.set(effectiveY, []);
      lines.get(effectiveY)!.push(ts);
    });

    // Remove all tspans (wrappers included) — direct text nodes are preserved
    allTspans.forEach((ts) => ts.remove());

    // Rebuild: one tspan per line
    const sortedYs = Array.from(lines.keys()).sort((a, b) => a - b);
    sortedYs.forEach((y) => {
      const group = lines.get(y)!;
      const combinedText = group.map((ts) => ts.textContent || "").join("");
      const newTspan = doc.createElementNS("http://www.w3.org/2000/svg", "tspan");

      const firstLetterSpacing = group[0].getAttribute("letter-spacing");
      if (firstLetterSpacing) newTspan.setAttribute("letter-spacing", firstLetterSpacing);

      if (y !== 0) {
        newTspan.setAttribute("x", group[0].getAttribute("x") || "0");
        newTspan.setAttribute("y", String(y));
      }

      newTspan.textContent = combinedText;
      textEl.appendChild(newTspan);
    });
  });

  return new XMLSerializer().serializeToString(doc);
};

export const parseSVGToGroupNode = async (svgString: string): Promise<GroupNode> => {
  const cleanString = collapseTspans(svgString);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svgReviver = (element: any, fabricObj: fabric.FabricObject) => {
    if (!fabricObj) return;

    if (fabricObj.type === "text" || fabricObj.type === "i-text") {
      if (!element.childNodes || element.childNodes.length === 0) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fontSize = (fabricObj as any).fontSize || 16;
      const children = Array.from(element.childNodes) as Element[];
      const tspans = children.filter((node) => node.nodeName === "tspan");

      // Build per-line data: each entry is the text and its absolute y offset
      // from the text element's origin (which is the baseline of the first line).
      // Math: top_of_line_N = p.y + y_N  (baseline offset cancels when same fontSize)
      const lines: Array<{ text: string; x: number; y: number }> = [];
      let currentY = 0;

      children.forEach((node) => {
        if (node.nodeType === 3) {
          // Direct text node — sits at the current y (initially 0)
          const text = (node.textContent || "").trim();
          if (text) lines.push({ text, x: 0, y: currentY });
        } else if (node.nodeType === 1 && node.nodeName === "tspan") {
          const text = node.textContent || "";
          const xAttr  = node.getAttribute("x");
          const yAttr  = node.getAttribute("y");
          const dyAttr = node.getAttribute("dy");

          const lineX = xAttr !== null ? parseFloat(xAttr) : 0;

          if (yAttr !== null) {
            currentY = parseFloat(yAttr);
          } else if (dyAttr !== null) {
            const dy = parseFloat(dyAttr);
            currentY += dyAttr.includes("em") ? dy * fontSize : dy;
          }

          if (text.trim()) lines.push({ text, x: lineX, y: currentY });
        }
      });

      if (lines.length > 0) {
        // @ts-ignore
        fabricObj.customLines = lines;
        // Keep text in sync for any fallback consumers
        // @ts-ignore
        fabricObj.text = lines.map((l) => l.text).join("\n");
      }

      // @ts-ignore
      fabricObj.detectedTextAlign = (fabricObj as any).textAlign || "left";
    }
  };

  const results = await fabric.loadSVGFromString(cleanString, svgReviver);
  const objects = results.objects.filter((o) => o !== null);
  const options = results.options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fixObjectsRecursive = (objs: any[]): any[] => {
    return objs.flatMap((obj) => {
      if (obj.type === "group" && obj._objects) {
        obj._objects = fixObjectsRecursive(obj._objects);
        return [obj];
      }

      if (obj.type === "text" || obj.type === "i-text") {
        const p = obj.getPointByOrigin("left", "top");
        const rawFontFamily = obj.fontFamily || "";
        const rawFontWeight = obj.fontWeight;
        const { family, weight } = getFontConfig(rawFontFamily, rawFontWeight);

        const hasFill   = obj.fill   && obj.fill   !== "none" && obj.fill   !== "";
        const hasStroke = obj.stroke && obj.stroke !== "none" && obj.stroke !== "";
        const finalTextAlign = obj.detectedTextAlign || obj.textAlign || "left";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const customLines = (obj as any).customLines as Array<{ text: string; x: number; y: number }> | undefined;

        const makeTextbox = (text: string, left: number, top: number) =>
          new fabric.Textbox(text, {
            left,
            top,
            width: obj.width + 20,
            fill:        hasFill   ? obj.fill   : "transparent",
            stroke:      hasStroke ? obj.stroke : undefined,
            strokeWidth: hasStroke ? (obj.strokeWidth ?? 0.5) : 0,
            paintFirst:  hasStroke && !hasFill ? "fill" : "stroke",
            fontSize:    obj.fontSize,
            fontFamily:  family,
            fontWeight:  weight,
            charSpacing: obj.charSpacing,
            textAlign:   finalTextAlign,
            lineHeight:  1.16,
            scaleX:      obj.scaleX,
            scaleY:      obj.scaleY,
            angle:       obj.angle,
            originX:     "left",
            originY:     "top",
            splitByGrapheme: false,
            editable:    true,
          });

        // Multi-line: one Textbox per tspan line, each at its exact x/y offset.
        if (customLines && customLines.length > 1) {
          return customLines.map(({ text, x, y }) => makeTextbox(text, p.x + x, p.y + y));
        }

        // Single line — keep original left-alignment adjustment
        const widthPadding = 20;
        let adjustedLeft = p.x;
        if (finalTextAlign === "center") adjustedLeft -= widthPadding / 2;
        else if (finalTextAlign === "right") adjustedLeft -= widthPadding;

        const singleText = customLines?.[0]?.text ?? obj.text ?? " ";
        return [makeTextbox(singleText, adjustedLeft, p.y)];
      }

      return [obj];
    });
  };

  const fixedObjects = fixObjectsRecursive(objects);
  const group = new fabric.Group(fixedObjects, {
    ...options,
    left: 400,
    top: 300,
    originX: "center",
    originY: "center",
    scaleX: 3,
    scaleY: 3,
  });

  const jsonOutput = group.toObject();
  
  // Clean up memory
  group.dispose();
  
  // Use our scene graph parser to validate and type the output
  return loadFromFabricJSON(jsonOutput);
};
