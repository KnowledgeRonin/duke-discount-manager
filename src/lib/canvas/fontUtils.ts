export function extractFontsFromFabricJSON(json: any): string[] {
  const fonts = new Set<string>();

  // Función recursiva para buscar en profundidad
  const traverse = (objects: any[]) => {
    objects.forEach((obj) => {
      // 1. Si tiene fontFamily, lo guardamos
      if (obj.fontFamily) {
        // Limpiamos un poco por si acaso (ej: "Poppins" vs "Poppins-Bold")
        // Asumimos que tu Sanitizer ya dejó el nombre limpio como "Poppins"
        fonts.add(obj.fontFamily);
      }

      // 2. Si es un grupo, buscamos en sus hijos
      if (obj.type === 'group' && Array.isArray(obj.objects)) {
        traverse(obj.objects);
      }
    });
  };

  // Fabric JSON suele tener la estructura { version: "...", objects: [...] }
  // O a veces es solo el array de objetos si lo guardaste así.
  const rootObjects = Array.isArray(json) ? json : (json.objects || []);
  
  traverse(rootObjects);

  // Convertimos el Set a Array y filtramos fuentes del sistema que no necesitan descarga
  const systemFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'sans-serif', 'serif'];
  
  return Array.from(fonts).filter(f => !systemFonts.includes(f));
}