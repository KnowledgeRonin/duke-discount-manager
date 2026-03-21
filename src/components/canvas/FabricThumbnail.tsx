import { useEffect, useState } from "react";
import * as fabric from "fabric";
import { Skeleton } from "@/components/ui/skeleton";

interface FabricThumbnailProps {
  jsonData: any;
}

const SYSTEM_FONTS = new Set(['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'sans-serif', 'serif']);

function collectFontPairs(objects: any[]): Array<{ family: string; weight: string | number }> {
  const pairs: Array<{ family: string; weight: string | number }> = [];
  for (const obj of objects) {
    if (obj.fontFamily && !SYSTEM_FONTS.has(obj.fontFamily)) {
      pairs.push({ family: obj.fontFamily, weight: obj.fontWeight ?? 400 });
    }
    if (obj.type === 'group' && Array.isArray(obj.objects)) {
      pairs.push(...collectFontPairs(obj.objects));
    }
  }
  return pairs;
}

async function ensureFontsLoaded(objects: any[]): Promise<void> {
  const pairs = collectFontPairs(objects);
  if (pairs.length === 0) return;
  await Promise.allSettled(
    pairs.map(({ family, weight }) =>
      document.fonts.load(`${weight} 12px "${family}"`)
    )
  );
}

export function FabricThumbnail({ jsonData }: FabricThumbnailProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!jsonData) return;

    let isCancelled = false;

    const canvasEl = document.createElement('canvas');
    const offscreenCanvas = new fabric.StaticCanvas(canvasEl);

    const renderAndExport = (objects: any[]) => {
      if (!objects || objects.length === 0 || isCancelled) return;

      offscreenCanvas.clear();

      const mainElement = objects.length === 1 ? objects[0] : new fabric.Group(objects);
      offscreenCanvas.add(mainElement);

      mainElement.setCoords();

      const br = mainElement.getBoundingRect();

      const dataUrl = offscreenCanvas.toDataURL({
        format: 'png',
        left: br.left,
        top: br.top,
        width: br.width,
        height: br.height,
        multiplier: 2
      });

      if (!isCancelled) {
        setImageSrc(dataUrl);
      }

      offscreenCanvas.dispose();
    };

    const doRender = async () => {
      const isFabricObject = jsonData && typeof jsonData.type === 'string' && jsonData.type !== 'canvas';
      const isArray = Array.isArray(jsonData);

      const objectsToLoad = isArray ? jsonData : isFabricObject ? [jsonData] : null;

      if (objectsToLoad) {
        await ensureFontsLoaded(objectsToLoad);
        if (isCancelled) return;

        let rendered = false;
        // @ts-ignore: Fabric.js types are outdated relative to the current version. This will be changed later
        const enlivenResult = fabric.util.enlivenObjects(objectsToLoad, (enlivenedObjects: any[]) => {
          if (!rendered) {
            rendered = true;
            renderAndExport(enlivenedObjects);
          }
        });

        if (enlivenResult && typeof enlivenResult.then === 'function') {
          enlivenResult.then((enlivenedObjects: any[]) => {
            if (!rendered) {
              rendered = true;
              renderAndExport(enlivenedObjects);
            }
          });
        }
      } else {
        offscreenCanvas.loadFromJSON(jsonData, () => {
          renderAndExport(offscreenCanvas.getObjects());
        });
      }
    };

    doRender();

    return () => {
      isCancelled = true;
      offscreenCanvas.dispose();
    };
  }, [jsonData]);

  if (!imageSrc) {
    return <Skeleton className="w-full h-full rounded-md" />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <img
        src={imageSrc}
        alt="Template thumbnail"
        className="w-[80%] object-contain drop-shadow-sm pointer-events-none"
      />
    </div>
  );
}
