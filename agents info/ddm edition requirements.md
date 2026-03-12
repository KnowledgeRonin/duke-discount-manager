Actúa como un Arquitecto Frontend Experto en Spec-Driven Development. 

Estoy construyendo el motor de personalización de plantillas para "Duke Discount Manager". El stack tecnológico es Next.js, React y TypeScript.

Necesito que redactes una especificación técnica completa (spec.md) para el Editor de Canvas. La arquitectura debe basarse en un "Scene Graph" (Árbol de Nodos) alimentado por un JSON jerárquico exportado desde Fabric.js. 

**1. Contrato de Datos (El estado inicial):**
El estado del canvas se inicializará con un JSON que tiene esta estructura base:
- Un nodo raíz (type: "group").
- Propiedades clave exportadas en cada nodo: `id` (identificador único de capa), `name`, `type` (textbox, path, group, etc.), y propiedades geométricas/estilo.

**2. Requisitos Funcionales a Implementar:**
El motor debe permitir la mutación del estado (JSON) para reflejar los siguientes cambios en la UI:

[ESTILIZADO DE TEXTO]
- Decoración: Negrita, Itálica, Subrayado, Tachado.
- Casing: Uppercase, lowercase, capitalize.
- Espaciado: Letter spacing y Line height.
- Alineación: Izquierda, centro, derecha, justificado.

[TRANSFORMACIONES Y GEOMETRÍA]
- Bounding Box: Manipulación de x, y, width, height.
- Rotación: Ángulos en grados.
- Opacidad: 0% a 100%.
- Z-Index: Reordenamiento del array de nodos (traer al frente, enviar al fondo).

[ESTÉTICA VISUAL]
- Relleno (Fill): Colores sólidos y gradientes.
- Trazo (Stroke): Color y grosor.
- Sombras: Blur, color, offsets.

[SMART LAYOUT]
- Centrado automático respecto al canvas padre.
- Distribución y Agrupamiento de múltiples nodos.

**3. Entregables Esperados en el spec.md:**
Por favor, genera la especificación estructurada que incluya:
1. **TypeScript Interfaces:** Define las interfaces estrictas para los Nodos del Scene Graph (ej. `TextNode`, `ShapeNode`, `GroupNode`).
2. **Zod Schemas:** Crea el esquema de validación para asegurar que las mutaciones del JSON sean seguras.
3. **State Management Strategy:** Propón la arquitectura de estado (recomienda Zustand o React Context) detallando las acciones (actions/reducers) necesarias para actualizar las propiedades mencionadas (ej. `updateNodeProperty(id, property, value)`, `reorderNodes(id, newIndex)`).
4. **Data Flow:** Explica brevemente cómo fluirá la información desde el menú de herramientas (UI) -> Estado -> Renderizado del Canvas.