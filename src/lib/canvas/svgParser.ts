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

    // ✅ Solo tspans hoja (sin descendientes tspan)
    const leafTspans = allTspans.filter(
      (ts) => ts.querySelectorAll("tspan").length === 0
    );

    if (leafTspans.length === 0) return;

    // Agrupar por Y efectivo (subir el árbol hasta encontrar el atributo y)
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

    // Eliminar todos los tspans (los wrapper también) — los nodos de texto directo se conservan
    allTspans.forEach((ts) => ts.remove());

    // Reconstruir: un tspan por línea
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
      let calculatedLineHeight = 1.16;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fontSize = (fabricObj as any).fontSize || 16;

      if (element.childNodes && element.childNodes.length > 0) {
        const children = Array.from(element.childNodes) as Element[];
        const tspans = children.filter((node) => node.nodeName === "tspan");

        if (tspans.length > 0) {
          const firstNewlineTspan = tspans.find((node) => {
            const yVal  = parseFloat(node.getAttribute("y")  || "0");
            const dyVal = parseFloat(node.getAttribute("dy") || "0");
            return yVal !== 0 || dyVal !== 0;
          });

          if (firstNewlineTspan) {
            const dyVal = parseFloat(firstNewlineTspan.getAttribute("dy") || "0");
            const yVal  = parseFloat(firstNewlineTspan.getAttribute("y")  || "0");
            const distanceY = dyVal !== 0 ? dyVal : yVal;
            if (distanceY > 0 && fontSize > 0) {
              calculatedLineHeight = distanceY / fontSize;
            }
          }

          let hasLineOffset = false;
          tspans.forEach((node) => {
            const yVal  = parseFloat(node.getAttribute("y")  || "0");
            const dyVal = parseFloat(node.getAttribute("dy") || "0");
            const xVal  = parseFloat(node.getAttribute("x")  || "0");
            if ((yVal !== 0 || dyVal !== 0) && xVal > 0) {
              hasLineOffset = true;
            }
          });

          // @ts-ignore
          fabricObj.detectedTextAlign = hasLineOffset ? "center" : (fabricObj.textAlign || "left");
        }

        // @ts-ignore
        fabricObj.customLineHeight = calculatedLineHeight;

        let constructedText = "";

        children.forEach((node) => {
          if (node.nodeType === 3) {
            constructedText += node.textContent || "";
          } else if (node.nodeType === 1 && node.nodeName === "tspan") {
            const textContent = node.textContent || "";
            const yVal  = parseFloat(node.getAttribute("y")  || "0");
            const dyVal = parseFloat(node.getAttribute("dy") || "0");

            if (yVal !== 0 || dyVal !== 0) {
              constructedText += (constructedText.length > 0 ? "\n" : "") + textContent;
            } else {
              constructedText += textContent;
            }
          }
        });

        if (constructedText) {
          // @ts-ignore
          fabricObj.text = constructedText.trim();
        }
      }
    }
  };

  const results = await fabric.loadSVGFromString(cleanString, svgReviver);
  const objects = results.objects.filter((o) => o !== null);
  const options = results.options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fixObjectsRecursive = (objs: any[]): any[] => {
    return objs.map((obj) => {
      if (obj.type === "group" && obj._objects) {
        obj._objects = fixObjectsRecursive(obj._objects);
        return obj;
      }

      if (obj.type === "text" || obj.type === "i-text") {
        const p = obj.getPointByOrigin("left", "top");
        const rawFontFamily = obj.fontFamily || "";
        const rawFontWeight = obj.fontWeight;
        const dynamicLineHeight = obj.customLineHeight || 1.16;
        const { family, weight } = getFontConfig(rawFontFamily, rawFontWeight);

        const hasFill   = obj.fill   && obj.fill   !== "none" && obj.fill   !== "";
        const hasStroke = obj.stroke && obj.stroke !== "none" && obj.stroke !== "";

        const widthPadding = 20;
        const finalTextAlign = obj.detectedTextAlign || obj.textAlign || "left";

        let adjustedLeft = p.x;
        if (finalTextAlign === "center") {
          adjustedLeft -= widthPadding / 2;
        } else if (finalTextAlign === "right") {
          adjustedLeft -= widthPadding;
        }

        return new fabric.Textbox(obj.text, {
          left: p.x,
          top: p.y,
          width: obj.width + 20,
          fill:        hasFill   ? obj.fill    : "transparent",
          stroke:      hasStroke ? obj.stroke  : undefined,
          strokeWidth: hasStroke ? (obj.strokeWidth ?? 0.5) : 0,
          paintFirst:  hasStroke && !hasFill ? "fill" : "stroke",
          fontSize: obj.fontSize,
          fontFamily: family,
          fontWeight: weight,
          charSpacing: obj.charSpacing,
          textAlign: obj.detectedTextAlign || obj.textAlign || "left",
          lineHeight: dynamicLineHeight,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          angle: obj.angle,
          originX: "left",
          originY: "top",
          splitByGrapheme: false,
          editable: true,
        });
      }
      return obj;
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
