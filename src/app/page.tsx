"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTemplates, deleteTemplate, type SavedTemplate } from "@/lib/supabase/templates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getTemplates()
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent navigating to editor
    setDeletingId(id);
    try {
      await deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: '"Spaceport", sans-serif' }}>Duke Discount Manager</h1>
          <p className="text-sm text-muted-foreground">Your saved templates</p>
        </div>
        <Button className="gap-2" onClick={() => router.push('/editor')}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </header>

      {/* Content */}
      <main className="px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-muted-foreground text-lg">No templates yet.</p>
            <Button className="gap-2" onClick={() => router.push('/editor')}>
              <Plus className="h-4 w-4" />
              Create your first template
            </Button>
          </div>
        ) : (
          // Template grid
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="group cursor-pointer overflow-hidden hover:shadow-md hover:border-blue-400 transition-all"
                onClick={() => router.push(`/editor/${template.id}`)}
              >
                {/* Thumbnail */}
                <div className="aspect-[2/1] bg-slate-100 overflow-hidden">
                  {template.thumbnail ? (
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No preview
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex items-start justify-between gap-2">
                  <div className="overflow-hidden">
                    <p className="font-medium text-sm truncate">{template.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, template.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 shrink-0"
                    disabled={deletingId === template.id}
                  >
                    {deletingId === template.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
