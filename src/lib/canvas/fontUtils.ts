export function extractFontsFromFabricJSON(json: any): string[] {
  const fonts = new Set<string>();

  // Recursive function to search in depth
  const traverse = (objects: any[]) => {
    objects.forEach((obj) => {
      // 1. If the object has a fontFamily, collect it
      if (obj.fontFamily) {
        // Light cleanup just in case (e.g. "Poppins" vs "Poppins-Bold")
        // Assumes the font name is already clean (e.g. "Poppins")
        fonts.add(obj.fontFamily);
      }

      // 2. If it's a group, recurse into its children
      if (obj.type === 'group' && Array.isArray(obj.objects)) {
        traverse(obj.objects);
      }
    });
  };

  // Fabric JSON usually has the shape { version: "...", objects: [...] }
  // Sometimes it's just the objects array if saved that way.
  const rootObjects = Array.isArray(json) ? json : (json.objects || []);

  traverse(rootObjects);

  // Convert the Set to an array and filter out system fonts that don't need downloading
  const systemFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'sans-serif', 'serif'];

  return Array.from(fonts).filter(f => !systemFonts.includes(f));
}
