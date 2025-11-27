export function Sidebar() {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, templateType: string) => {
    // Almacena el tipo de plantilla que se está arrastrando en el objeto de datos de transferencia.
    e.dataTransfer.setData("application/template-type", templateType);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="w-64 p-4 border-r">
      <h3 className="font-semibold mb-3">Plantillas</h3>
      <div 
        className="p-3 bg-gray-100 border rounded cursor-grab mb-2"
        draggable="true" // ⬅️ Habilita el arrastre de HTML
        onDragStart={(e) => handleDragStart(e, "RECTANGLE")} // ⬅️ Define los datos
     > 
        Plantilla Rectángulo
      </div>
      {/* ... más plantillas ... */}
    </div>
  );
}