"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/lib/canvas/store";
import { Editor } from "@/components/editor/Editor";

export default function EditorPage() {
  const loadScene = useCanvasStore((state) => state.loadScene);

  // Start with a clean empty canvas
  useEffect(() => {
    loadScene({ version: '7.0.0', objects: [] });
  }, [loadScene]);

  return <Editor />;
}
