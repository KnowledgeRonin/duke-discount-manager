// src/utils/library.ts

// Importas tus JSONs desde sus respectivos archivos
import { VOUCHER_JSON_1 } from "@/mockData/json1";
import { VOUCHER_JSON_2 } from "@/mockData/json2";
import { VOUCHER_JSON_3 } from "@/mockData/json3";

// Defines los thumbnails (pueden ir en otro archivo si son muy largos)
export const THUMBNAIL_1 = `<svg>...</svg>`;
export const THUMBNAIL_2 = `<svg>...</svg>`;
export const THUMBNAIL_3 = `<svg>...</svg>`;

export type LibraryItem = {
  id: string;
  type: 'SVG' | 'JSON';
  label: string;
  content: string;
  canvasData?: any; // Luego puedes tipar esto mejor si todos los JSON comparten la misma interfaz
  viewBox: { w: number; h: number };
};

export const SVG_LIBRARY: LibraryItem[] = [
  // ... (Tus formas básicas si las mantienes)
  {
    id: 'voucher_1',
    type: 'JSON',
    label: 'Voucher Naranja',
    content: THUMBNAIL_1,
    canvasData: VOUCHER_JSON_1,
    viewBox: { w: 197, h: 100 }
  },
  {
    id: 'voucher_2',
    type: 'JSON',
    label: 'Voucher Azul',
    content: THUMBNAIL_2,
    canvasData: VOUCHER_JSON_2,
    viewBox: { w: 197, h: 100 }
  },
  {
    id: 'voucher_3',
    type: 'JSON',
    label: 'Voucher Verde',
    content: THUMBNAIL_3,
    canvasData: VOUCHER_JSON_3,
    viewBox: { w: 197, h: 100 }
  }
];