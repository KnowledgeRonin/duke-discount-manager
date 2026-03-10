import { useEffect, useState } from "react";
import * as fabric from "fabric"; 
import { Skeleton } from "@/components/ui/skeleton";
import { extractFontsFromFabricJSON } from "@/utils/fontUtils";
import { loadGoogleFonts } from "@/utils/fontLoader";

interface FabricThumbnailProps {
  jsonData: any;
}

export function FabricThumbnail({ jsonData }: FabricThumbnailProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!jsonData) return;
    
    // Flag para evitar Race Conditions si el componente se desmonta 
    // o el jsonData cambia rápidamente antes de que termine el render
    let isCancelled = false; 

    const canvasEl = document.createElement('canvas');
    const offscreenCanvas = new fabric.StaticCanvas(canvasEl);

    const renderAndExport = (objects: any[]) => {
      if (!objects || objects.length === 0 || isCancelled) return;

      offscreenCanvas.clear();

      const mainElement = objects.length === 1 ? objects[0] : new fabric.Group(objects);
      offscreenCanvas.add(mainElement);
      
      mainElement.setCoords(); // Actualiza medidas

      // Medimos el cuadro delimitador (bounding box) real
      const br = mainElement.getBoundingRect();

      // Magia pura: toDataURL nos permite exportar SOLO el área que ocupa el objeto,
      // ignorando el resto del canvas. Le damos un multiplier de 2 para que sea HD.
      const dataUrl = offscreenCanvas.toDataURL({
        format: 'png',
        left: br.left,
        top: br.top,
        width: br.width,
        height: br.height,
        multiplier: 2 // Genera una imagen al doble de resolución (nítida al hacer scale)
      });

      if (!isCancelled) {
        setImageSrc(dataUrl);
      }
      
      offscreenCanvas.dispose();
    };

    // --- CARGAR FUENTES ANTES DE RENDERIZAR ---
    const fonts = extractFontsFromFabricJSON(jsonData);

    const doRender = async () => {
      if (fonts.length > 0) {
        await loadGoogleFonts(fonts);
        await document.fonts.ready;
      }
      if (isCancelled) return;

      // --- DETECCIÓN INTELIGENTE DE FORMATO ---
      const isFabricObject = jsonData && typeof jsonData.type === 'string' && jsonData.type !== 'canvas';
      const isArray = Array.isArray(jsonData);

      if (isArray || isFabricObject) {
        const objectsToLoad = isArray ? jsonData : [jsonData];
        
        const enlivenResult = fabric.util.enlivenObjects(objectsToLoad, (enlivenedObjects: any[]) => {
          renderAndExport(enlivenedObjects);
        });

        if (enlivenResult && typeof enlivenResult.then === 'function') {
          enlivenResult.then((enlivenedObjects: any[]) => renderAndExport(enlivenedObjects));
        }
      } else {
        offscreenCanvas.loadFromJSON(jsonData, () => {
          renderAndExport(offscreenCanvas.getObjects());
        });
      }
    };

    doRender();

    // Cleanup function: cancela la actualización de estado si el componente se desmonta
    return () => {
      isCancelled = true;
      offscreenCanvas.dispose();
    };
  }, [jsonData]);

  if (!imageSrc) {
    return <Skeleton className="w-full h-full rounded-md" />; 
  }

  return (
    // El wrapper flex se asegura de centrarlo y darle el área completa
    <div className="w-full h-full flex items-center justify-center">
      <img 
        src={imageSrc} 
        alt="Template thumbnail" 
        // 👇 Aquí está la magia responsiva al 80%
        className="w-[80%] object-contain drop-shadow-sm pointer-events-none" 
      />
    </div>
  );
}