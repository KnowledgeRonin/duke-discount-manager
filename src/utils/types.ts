export type BlockType = 'SVG' | 'JSON';

export interface Block {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  text?: string;
  fill: string;
  svgContent?: string;
  viewBox: { w: number; h: number };
  jsonData?: Record<string, any>;
}