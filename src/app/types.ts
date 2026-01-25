export type BlockType = 'SVG';

export interface Block {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  text?: string;
  fill: string;
  pathData: string; // Fabric necesita el path string
}