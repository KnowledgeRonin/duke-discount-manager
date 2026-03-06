"use client";
import { useState } from "react";
import * as fabric from "fabric";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SVG_LIBRARY } from "@/app/page"; 

const WEIGHT_KEYWORDS: Record<string, number> = {
  'thin': 100,
  'hairline': 100,
  'extralight': 200,
  'ultralight': 200,
  'light': 300,
  'regular': 400,
  'normal': 400,
  'medium': 500,
  'semibold': 600,
  'demibold': 600,
  'bold': 700,
  'extrabold': 800,
  'ultrabold': 800,
  'black': 900,
  'heavy': 900,
  'extra': 800 
};

const FONT_FAMILY_EXCEPTIONS: Record<string, string> = {
  'BigShouldersDisplay': 'Big Shoulders Display',
  'OpenSans': 'Open Sans',
  'ComicNeue': 'Comic Neue',
};

const getFontConfig = (fontName: string, originalWeight: string | number) => {
  if (!fontName) return { family: 'Poppins', weight: 'normal' };

  if (originalWeight && originalWeight !== 'normal' && !isNaN(Number(originalWeight))) {
     let cleanFamily = fontName.split('-')[0].trim();
     if (FONT_FAMILY_EXCEPTIONS[cleanFamily]) cleanFamily = FONT_FAMILY_EXCEPTIONS[cleanFamily];
     return { family: cleanFamily, weight: originalWeight };
  }

  let detectedWeight: string | number = 'normal';
  let familyParts: string[] = [];

  const normalizedName = fontName.replace(/-/g, ' '); 
  const nameParts = normalizedName.split(' ');

  nameParts.forEach((part) => {
    const lowerPart = part.toLowerCase();
    if (WEIGHT_KEYWORDS[lowerPart]) {
      detectedWeight = WEIGHT_KEYWORDS[lowerPart];
    } else {
      familyParts.push(part);
    }
  });

  let finalFamily = familyParts.join(' '); 
  const compressedName = finalFamily.replace(/\s+/g, '');
  if (FONT_FAMILY_EXCEPTIONS[compressedName]) {
    finalFamily = FONT_FAMILY_EXCEPTIONS[compressedName];
  }

  return { 
    family: finalFamily, 
    weight: detectedWeight 
  };
};

export default function JsonExtractor() {
  const [status, setStatus] = useState("Listo para convertir");

  const processSvg = async (item: any) => {
    setStatus(`Procesando ${item.label}...`);
    const cleanString = item.content; 

    const tempCanvas = new fabric.StaticCanvas(undefined, { width: 800, height: 600 });

    try {
      await document.fonts.ready;

      const svgReviver = (element: any, fabricObj: fabric.FabricObject) => {
        if (!fabricObj) return;

        if (fabricObj.type === 'text' || fabricObj.type === 'i-text') {
           
           // 1. Detección de LineHeight Dinámico (Corregido)
           let calculatedLineHeight = 1.16; // Multiplicador por defecto seguro
           
           // A. Usamos el fontSize que Fabric YA parseó de las clases CSS
           const fontSize = (fabricObj as any).fontSize || 16;
           
           if (element.childNodes && element.childNodes.length > 0) {
              const children = Array.from(element.childNodes) as Element[];
              const tspans = children.filter(node => node.nodeName === "tspan");

              if (tspans.length > 0) {
                // Buscamos el primer tspan que provoque un salto vertical
                const firstNewlineTspan = tspans.find(node => node.hasAttribute("y") || node.hasAttribute("dy"));

                if (firstNewlineTspan) {
                    let distanceY = 0;
                    
                    if (firstNewlineTspan.hasAttribute("dy")) {
                        distanceY = parseFloat(firstNewlineTspan.getAttribute("dy") || "0");
                    } else if (firstNewlineTspan.hasAttribute("y")) {
                        distanceY = parseFloat(firstNewlineTspan.getAttribute("y") || "0");
                    }

                    // Calculamos el ratio real: Distancia / Tamaño de la fuente
                    if (distanceY > 0 && fontSize > 0) {
                        calculatedLineHeight = distanceY / fontSize;
                    }
                }
              }

              // Guardamos la propiedad para que el recursivo la encuentre
              // @ts-ignore
              fabricObj.customLineHeight = calculatedLineHeight;

              // 2. Reconstrucción del Texto
              let constructedText = "";
              children.forEach((node) => {
                if (node.nodeType === 3) { // Nodo de texto puro
                   constructedText += node.textContent?.trim() || "";
                } 
                else if (node.nodeType === 1 && node.nodeName === "tspan") {
                   const tspan = node;
                   const textContent = tspan.textContent?.trim() || "";
                   
                   // Evitamos un salto de línea inicial si el texto estaba vacío
                   if (tspan.hasAttribute("x") || tspan.hasAttribute("y") || tspan.hasAttribute("dy")) {
                      constructedText += (constructedText.length > 0 ? "\n" : "") + textContent;
                   } else {
                      constructedText += " " + textContent;
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

      const fixObjectsRecursive = (objs: any[]): any[] => {
        return objs.map((obj) => {
          if (obj.type === 'group' && obj._objects) {
            obj._objects = fixObjectsRecursive(obj._objects);
            return obj;
          }

          if (obj.type === 'text' || obj.type === 'i-text') {
            const p = obj.getPointByOrigin('left', 'top');
            
            const rawFontFamily = obj.fontFamily || '';
            const rawFontWeight = obj.fontWeight;
            
            // Recuperamos el cálculo o aplicamos un valor de seguridad
            const dynamicLineHeight = obj.customLineHeight || 1.16;

            const { family, weight } = getFontConfig(rawFontFamily, rawFontWeight);

            return new fabric.Textbox(obj.text, {
              left: p.x,
              top: p.y,
              width: obj.width + 20, 
              fill: obj.fill,
              fontSize: obj.fontSize,
              fontFamily: family,
              fontWeight: weight, 
              charSpacing: obj.charSpacing, 
              textAlign: obj.textAlign || 'left',
              lineHeight: dynamicLineHeight, // Se inyecta correctamente aquí
              scaleX: obj.scaleX,
              scaleY: obj.scaleY,
              angle: obj.angle,
              originX: 'left',
              originY: 'top',
              splitByGrapheme: false,
              editable: true 
            });
          }
          return obj;
        });
      };

      const fixedObjects = fixObjectsRecursive(objects);
      const group = new fabric.Group(fixedObjects, {
        ...options,
        left: 400, top: 300, originX: 'center', originY: 'center', scaleX: 3, scaleY: 3
      });
      tempCanvas.add(group);
      
      const jsonOutput = group.toObject();
      await navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2));
      setStatus(`✅ JSON de "${item.label}" copiado!`);
      tempCanvas.dispose();

    } catch (e) {
      console.error(e);
      setStatus("❌ Error: " + String(e));
    }
  };

  return (
    <div className="p-10 flex flex-col gap-6 bg-slate-50 min-h-screen">
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h1 className="text-2xl font-bold mb-2">Extractor de Templates V2</h1>
        <p className="text-slate-500">Estado: <span className="font-mono font-bold text-blue-600">{status}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SVG_LIBRARY.map((item) => (
          <Card key={item.id} className="p-4 flex flex-col gap-4">
             <div className="aspect-video bg-slate-100 rounded-md flex items-center justify-center p-4 border overflow-hidden">
                <div dangerouslySetInnerHTML={{ __html: item.content }} className="w-full h-full [&>svg]:w-full [&>svg]:h-full" />
             </div>
             <div className="flex justify-between items-center">
                 <span className="font-bold">{item.label}</span>
                 <span className="text-xs bg-slate-200 px-2 py-1 rounded">{item.type}</span>
             </div>
             <Button onClick={() => processSvg(item)} className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                 Corregir y Extraer JSON
             </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}