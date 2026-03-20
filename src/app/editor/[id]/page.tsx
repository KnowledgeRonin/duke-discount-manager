"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCanvasStore } from "@/lib/canvas/store";
import { getTemplate } from "@/lib/supabase/templates";
import { Editor } from "@/components/editor/Editor";
import { Loader2 } from "lucide-react";

export default function EditorTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const loadScene = useCanvasStore((state) => state.loadScene);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTemplate(id)
      .then((template) => {
        loadScene(template.scene_graph);
        setReady(true);
      })
      .catch(() => {
        setError('Template not found.');
      });
  }, [id, loadScene]);

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="text-sm underline text-muted-foreground"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <Editor />;
}
