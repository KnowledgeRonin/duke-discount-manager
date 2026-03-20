import { useEffect, useState } from "react";
import * as fabric from "fabric";
import { Skeleton } from "@/components/ui/skeleton";
import { extractFontsFromFabricJSON } from "@/lib/canvas/fontUtils";
import { loadGoogleFonts } from "@/lib/canvas/fontLoader";

interface FabricThumbnailProps {
  jsonData: any;
}

export function FabricThumbnail({ jsonData }: FabricThumbnailProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!jsonData) return;

    // Flag to prevent race conditions if the component unmounts
    // or jsonData changes rapidly before the render completes
    let isCancelled = false;

    const canvasEl = document.createElement('canvas');
    const offscreenCanvas = new fabric.StaticCanvas(canvasEl);

    const renderAndExport = (objects: any[]) => {
      if (!objects || objects.length === 0 || isCancelled) return;

      offscreenCanvas.clear();

      const mainElement = objects.length === 1 ? objects[0] : new fabric.Group(objects);
      offscreenCanvas.add(mainElement);

      mainElement.setCoords(); // Update bounding coordinates

      // Measure the actual bounding box
      const br = mainElement.getBoundingRect();

      // toDataURL lets us export ONLY the area occupied by the object,
      // ignoring the rest of the canvas. A multiplier of 2 makes it HD.
      const dataUrl = offscreenCanvas.toDataURL({
        format: 'png',
        left: br.left,
        top: br.top,
        width: br.width,
        height: br.height,
        multiplier: 2 // Renders at double resolution (stays sharp when scaled down)
      });

      if (!isCancelled) {
        setImageSrc(dataUrl);
      }

      offscreenCanvas.dispose();
    };

    // --- LOAD FONTS BEFORE RENDERING ---
    const fonts = extractFontsFromFabricJSON(jsonData);

    const doRender = async () => {
      if (fonts.length > 0) {
        await loadGoogleFonts(fonts);
        await document.fonts.ready;
      }
      if (isCancelled) return;

      // --- SMART FORMAT DETECTION ---
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

    // Cleanup function: cancels state updates if the component unmounts
    return () => {
      isCancelled = true;
      offscreenCanvas.dispose();
    };
  }, [jsonData]);

  if (!imageSrc) {
    return <Skeleton className="w-full h-full rounded-md" />;
  }

  return (
    // The flex wrapper centers the image and gives it the full available area
    <div className="w-full h-full flex items-center justify-center">
      <img
        src={imageSrc}
        alt="Template thumbnail"
        // Responsive sizing at 80% of the container
        className="w-[80%] object-contain drop-shadow-sm pointer-events-none"
      />
    </div>
  );
}
