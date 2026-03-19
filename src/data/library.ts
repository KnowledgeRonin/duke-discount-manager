import VOUCHER_JSON_1 from "@/data/templates/json1.json";
import VOUCHER_JSON_2 from "@/data/templates/json2.json";
import VOUCHER_JSON_5 from "@/data/templates/json5.json";

export type LibraryItem = {
  id: string;
  type: 'SVG' | 'JSON';
  label: string;
  content?: string; // Raw SVG/HTML string for SVG-type items
  canvasData?: any; // Fabric.js JSON data for JSON-type items
  viewBox: { w: number; h: number };
};

export const SVG_LIBRARY: LibraryItem[] = [
  // ... (Tus formas básicas si las mantienes)
  {
    id: 'voucher_1',
    type: 'JSON',
    label: 'Voucher1',
    canvasData: VOUCHER_JSON_1,
    viewBox: { w: 197, h: 100 }
  },
  {
    id: 'voucher_2',
    type: 'JSON',
    label: 'Voucher2',
    canvasData: VOUCHER_JSON_2,
    viewBox: { w: 197, h: 100 }
  },
  {
    id: 'voucher_5',
    type: 'JSON',
    label: 'Voucher5',
    canvasData: VOUCHER_JSON_5,
    viewBox: { w: 197, h: 100 }
  }
];