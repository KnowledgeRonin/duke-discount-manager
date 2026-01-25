export type BlockType = 'SVG';

export interface Block {
  id: string;
  type: BlockType; 
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  
  // Visual properties
  fill: string;
  pathData: string;
  viewBox: { w: number; h: number };
}

export interface LibraryItem {
  id: string;
  label: string;
  path: string;
  viewBox: { w: number; h: number };
}