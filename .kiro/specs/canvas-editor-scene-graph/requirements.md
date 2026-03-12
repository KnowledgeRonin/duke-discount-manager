# Documento de Requisitos: Canvas Editor Scene Graph

## Introducción

El Canvas Editor Scene Graph es un motor de personalización de plantillas para Duke Discount Manager que permite la edición visual de elementos gráficos mediante un árbol jerárquico de nodos (Scene Graph). El sistema gestiona la manipulación de texto, formas geométricas, transformaciones y estilos visuales a través de un estado inmutable validado con TypeScript y Zod, sincronizado con un canvas renderizado mediante Fabric.js.

## Glosario

- **Scene_Graph**: Estructura de datos jerárquica que representa todos los elementos visuales del canvas como un árbol de nodos
- **Scene_Node**: Unidad básica del Scene Graph que representa un elemento visual (texto, forma, grupo, etc.)
- **Store**: Gestor de estado global basado en Zustand que mantiene el Scene Graph y proporciona acciones para manipularlo
- **Canvas_Renderer**: Componente responsable de sincronizar el estado del Scene Graph con la representación visual en Fabric.js
- **Validation_Layer**: Capa de validación que utiliza Zod para garantizar la integridad de datos en runtime
- **TextNode**: Tipo de nodo que representa elementos de texto editables con propiedades tipográficas
- **ShapeNode**: Tipo de nodo que representa formas geométricas (rectángulos, círculos, polígonos, paths)
- **GroupNode**: Tipo de nodo contenedor que agrupa múltiples nodos hijos en una jerarquía
- **History_State**: Estructura que mantiene el historial de cambios para funcionalidad de deshacer/rehacer
- **Fabric_Object**: Objeto de Fabric.js que representa un elemento visual en el canvas
- **Z_Index**: Orden de apilamiento visual de los elementos en el canvas

## Requisitos

### Requisito 1: Gestión de Estado del Scene Graph

**User Story:** Como desarrollador del sistema, quiero gestionar el Scene Graph como un estado inmutable validado, para garantizar consistencia y predictibilidad en todas las operaciones de edición.

#### Criterios de Aceptación

1. THE Store SHALL mantener el Scene Graph como una estructura de árbol inmutable
2. WHEN se realiza cualquier operación de actualización, THE Store SHALL crear una nueva referencia del estado sin mutar el estado anterior
3. WHEN se inicializa el Store, THE Store SHALL validar la estructura completa del Scene Graph mediante Zod schemas
4. THE Store SHALL proporcionar un índice Map<string, SceneNode> para búsquedas O(1) por ID de nodo
5. WHEN se busca un nodo por ID inexistente, THE Store SHALL retornar null sin lanzar excepciones

### Requisito 2: Actualización de Propiedades de Nodos

**User Story:** Como usuario del editor, quiero modificar propiedades de elementos visuales (color, tamaño, posición), para personalizar el diseño de la plantilla.

#### Criterios de Aceptación

1. WHEN se actualiza una propiedad de un nodo, THE Store SHALL validar el valor contra el schema Zod correspondiente al tipo de nodo
2. IF la validación falla, THEN THE Store SHALL lanzar un error descriptivo y mantener el estado sin cambios
3. WHEN se actualiza una propiedad válida, THE Store SHALL aplicar el cambio de forma inmutable y notificar a los suscriptores
4. THE Store SHALL soportar actualización de múltiples propiedades en una sola operación atómica
5. WHEN se actualiza un nodo, THE Canvas_Renderer SHALL sincronizar automáticamente el Fabric_Object correspondiente

### Requisito 3: Edición de Nodos de Texto

**User Story:** Como usuario del editor, quiero editar propiedades tipográficas de elementos de texto (fuente, tamaño, estilo, alineación), para ajustar la apariencia del contenido textual.

#### Criterios de Aceptación

1. WHEN se actualiza el contenido de texto, THE Store SHALL validar que el texto no esté vacío
2. WHEN se actualiza fontSize, THE Store SHALL validar que el valor esté entre 1 y 500
3. WHEN se actualiza fontWeight como número, THE Store SHALL validar que sea múltiplo de 100 entre 100 y 900
4. WHEN se actualiza charSpacing, THE Store SHALL validar que el valor esté entre -200 y 800
5. WHEN se actualiza lineHeight, THE Store SHALL validar que el valor esté entre 0.5 y 3.0
6. THE Store SHALL soportar propiedades de decoración de texto (underline, linethrough, overline)
7. THE Store SHALL soportar transformaciones de texto (uppercase, lowercase, capitalize)
8. THE Store SHALL soportar alineación de texto (left, center, right, justify)

### Requisito 4: Manipulación de Formas Geométricas

**User Story:** Como usuario del editor, quiero manipular formas geométricas (rectángulos, círculos, polígonos), para construir diseños visuales complejos.

#### Criterios de Aceptación

1. WHEN se crea o actualiza un RectNode, THE Store SHALL validar que rx y ry sean mayores o iguales a 0
2. WHEN se crea o actualiza un CircleNode, THE Store SHALL validar que radius sea mayor a 0
3. WHEN se crea o actualiza un PolygonNode, THE Store SHALL validar que points contenga al menos 3 puntos
4. WHEN se crea o actualiza un PathNode, THE Store SHALL validar que el primer comando sea 'M' (MoveTo)
5. WHEN se crea o actualiza un PathNode, THE Store SHALL validar que path no esté vacío
6. THE Store SHALL soportar propiedades de estilo visual (fill, stroke, strokeWidth, opacity, shadow)

### Requisito 5: Transformaciones Geométricas

**User Story:** Como usuario del editor, quiero aplicar transformaciones geométricas a elementos (posición, rotación, escala, sesgo), para ajustar su ubicación y apariencia en el canvas.

#### Criterios de Aceptación

1. THE Store SHALL soportar propiedades de posición (left, top) como números sin restricciones
2. WHEN se actualiza angle, THE Store SHALL validar que el valor esté entre -360 y 360 grados
3. WHEN se actualiza scaleX o scaleY, THE Store SHALL validar que los valores sean positivos
4. THE Store SHALL soportar propiedades de origen de transformación (originX, originY)
5. THE Store SHALL soportar propiedades de volteo (flipX, flipY) como booleanos
6. THE Store SHALL soportar propiedades de sesgo (skewX, skewY) como números sin restricciones

### Requisito 6: Gestión de Orden Visual (Z-Index)

**User Story:** Como usuario del editor, quiero controlar el orden de apilamiento de elementos, para definir qué elementos aparecen encima de otros.

#### Criterios de Aceptación

1. WHEN se ejecuta bringToFront en un nodo, THE Store SHALL mover el nodo al final del array objects de su padre
2. WHEN se ejecuta sendToBack en un nodo, THE Store SHALL mover el nodo al inicio del array objects de su padre
3. WHEN se ejecuta bringForward en un nodo, THE Store SHALL intercambiar el nodo con el siguiente en el array objects
4. WHEN se ejecuta sendBackward en un nodo, THE Store SHALL intercambiar el nodo con el anterior en el array objects
5. IF un nodo ya está en la posición objetivo, THEN THE Store SHALL no realizar cambios ni notificar suscriptores
6. WHEN se reordena un nodo, THE Canvas_Renderer SHALL actualizar el orden visual en Fabric.js

### Requisito 7: Agrupación y Desagrupación de Nodos

**User Story:** Como usuario del editor, quiero agrupar múltiples elementos en un contenedor, para manipularlos como una unidad y organizar la jerarquía del diseño.

#### Criterios de Aceptación

1. WHEN se ejecuta groupNodes con 2 o más nodeIds, THE Store SHALL crear un nuevo GroupNode conteniendo los nodos especificados
2. IF los nodos a agrupar no tienen el mismo padre, THEN THE Store SHALL lanzar InvalidOperationError
3. IF se intenta agrupar menos de 2 nodos, THEN THE Store SHALL lanzar InvalidOperationError
4. WHEN se crea un grupo, THE Store SHALL calcular el bounding box que contiene todos los nodos hijos
5. WHEN se crea un grupo, THE Store SHALL ajustar las posiciones de los nodos hijos a coordenadas relativas al grupo
6. WHEN se crea un grupo, THE Store SHALL insertar el nuevo grupo en la posición del primer nodo original
7. WHEN se ejecuta ungroupNodes en un GroupNode, THE Store SHALL extraer los nodos hijos y ajustar sus posiciones a coordenadas absolutas
8. WHEN se agrupa o desagrupa, THE Store SHALL retornar el ID del nuevo grupo o los IDs de los nodos extraídos

### Requisito 8: Layout Inteligente

**User Story:** Como usuario del editor, quiero aplicar operaciones de layout automático (centrado, distribución), para alinear elementos de forma precisa sin cálculos manuales.

#### Criterios de Aceptación

1. WHEN se ejecuta centerNode, THE Store SHALL calcular la posición que centra el nodo respecto a su padre
2. WHEN se calcula el centrado, THE Store SHALL considerar las dimensiones efectivas (width * scaleX, height * scaleY)
3. WHEN se calcula el centrado, THE Store SHALL ajustar según las propiedades originX y originY del nodo
4. WHEN se ejecuta distributeHorizontally con múltiples nodeIds, THE Store SHALL espaciar los nodos uniformemente en el eje X
5. WHEN se ejecuta distributeVertically con múltiples nodeIds, THE Store SHALL espaciar los nodos uniformemente en el eje Y
6. WHEN se aplica layout, THE Store SHALL actualizar las propiedades left y top de los nodos afectados

### Requisito 9: Historial de Deshacer/Rehacer

**User Story:** Como usuario del editor, quiero deshacer y rehacer cambios, para corregir errores y explorar diferentes opciones de diseño.

#### Criterios de Aceptación

1. WHEN se realiza cualquier operación que modifica el estado, THE Store SHALL agregar el estado anterior a history.past
2. WHEN se agrega un estado al historial, THE Store SHALL limpiar history.future (nueva rama de historial)
3. WHEN history.past excede el tamaño máximo configurado, THE Store SHALL remover el estado más antiguo
4. WHEN se ejecuta undo, THE Store SHALL mover el estado actual a history.future y restaurar el último estado de history.past
5. WHEN se ejecuta redo, THE Store SHALL mover el estado actual a history.past y restaurar el último estado de history.future
6. IF history.past está vacío, THEN undo SHALL no realizar cambios
7. IF history.future está vacío, THEN redo SHALL no realizar cambios
8. WHEN se deshace y rehace una operación, THE Store SHALL restaurar el estado exacto (idempotencia)

### Requisito 10: Selección de Nodos

**User Story:** Como usuario del editor, quiero seleccionar uno o múltiples elementos, para aplicar operaciones sobre ellos.

#### Criterios de Aceptación

1. WHEN se ejecuta selectNode con un nodeId válido, THE Store SHALL actualizar selectedNodeIds con ese ID
2. WHEN se ejecuta selectMultipleNodes, THE Store SHALL reemplazar selectedNodeIds con el array proporcionado
3. WHEN se ejecuta clearSelection, THE Store SHALL vaciar el array selectedNodeIds
4. THE Store SHALL notificar a suscriptores cuando cambia la selección
5. WHEN se selecciona un nodo en el Canvas_Renderer, THE Canvas_Renderer SHALL llamar a selectNode en el Store

### Requisito 11: Validación de Integridad del Scene Graph

**User Story:** Como desarrollador del sistema, quiero garantizar la integridad estructural del Scene Graph, para prevenir estados inválidos que causen errores en runtime.

#### Criterios de Aceptación

1. WHEN se valida un Scene Graph, THE Validation_Layer SHALL verificar que todos los IDs de nodos sean únicos
2. IF se detectan IDs duplicados, THEN THE Validation_Layer SHALL lanzar un error con el ID duplicado
3. WHEN se valida un Scene Graph, THE Validation_Layer SHALL verificar que la profundidad del árbol no exceda el máximo configurado (10 niveles)
4. IF la profundidad excede el máximo, THEN THE Validation_Layer SHALL lanzar un error descriptivo
5. WHEN se valida un Scene Graph, THE Validation_Layer SHALL verificar que el número total de nodos no exceda el máximo configurado (1000 nodos)
6. IF el número de nodos excede el máximo, THEN THE Validation_Layer SHALL lanzar un error descriptivo
7. THE Validation_Layer SHALL prevenir referencias circulares en la jerarquía de grupos

### Requisito 12: Sincronización Estado-Canvas

**User Story:** Como usuario del editor, quiero que los cambios en el estado se reflejen inmediatamente en el canvas visual, para obtener feedback instantáneo de mis ediciones.

#### Criterios de Aceptación

1. WHEN el Store notifica un cambio de nodo, THE Canvas_Renderer SHALL sincronizar el Fabric_Object correspondiente
2. WHEN se sincroniza un nodo, THE Canvas_Renderer SHALL actualizar todas las propiedades visuales del Fabric_Object
3. WHEN se sincroniza un TextNode, THE Canvas_Renderer SHALL actualizar propiedades específicas de texto (fontFamily, fontSize, etc.)
4. WHEN se sincroniza un nodo, THE Canvas_Renderer SHALL llamar a setCoords() y renderAll() para actualizar la visualización
5. IF no se encuentra el Fabric_Object para un nodeId, THEN THE Canvas_Renderer SHALL registrar una advertencia sin lanzar error

### Requisito 13: Captura de Eventos del Canvas

**User Story:** Como usuario del editor, quiero manipular elementos directamente en el canvas (arrastrar, redimensionar, rotar), para editar de forma visual e intuitiva.

#### Criterios de Aceptación

1. WHEN un usuario selecciona un objeto en el canvas, THE Canvas_Renderer SHALL capturar el evento 'selection:created' de Fabric.js
2. WHEN se captura una selección, THE Canvas_Renderer SHALL extraer el nodeId y llamar a selectNode en el Store
3. WHEN un usuario modifica un objeto en el canvas, THE Canvas_Renderer SHALL capturar el evento 'object:modified' de Fabric.js
4. WHEN se captura una modificación, THE Canvas_Renderer SHALL extraer las propiedades modificadas (left, top, scaleX, scaleY, angle)
5. WHEN se captura una modificación, THE Canvas_Renderer SHALL llamar a updateMultipleProperties en el Store con los cambios
6. THE Canvas_Renderer SHALL prevenir loops infinitos ignorando notificaciones de cambios que originó

### Requisito 14: Carga e Inicialización desde JSON

**User Story:** Como usuario del sistema, quiero cargar plantillas desde archivos JSON de Fabric.js, para inicializar el editor con diseños existentes.

#### Criterios de Aceptación

1. WHEN se carga un JSON externo, THE Validation_Layer SHALL validar la estructura completa contra los schemas Zod
2. IF el JSON es inválido, THEN THE Validation_Layer SHALL lanzar un error descriptivo con detalles de validación
3. WHEN la validación es exitosa, THE Store SHALL inicializar el estado con el árbol validado
4. WHEN se inicializa el Store, THE Canvas_Renderer SHALL crear Fabric_Objects para cada nodo del árbol
5. WHEN se renderiza el árbol inicial, THE Canvas_Renderer SHALL construir la jerarquía de grupos correctamente
6. WHEN se completa la inicialización, THE Canvas_Renderer SHALL renderizar la escena completa

### Requisito 15: Exportación a JSON

**User Story:** Como usuario del sistema, quiero exportar el diseño actual a formato JSON de Fabric.js, para guardar el trabajo y compartir plantillas.

#### Criterios de Aceptación

1. WHEN se ejecuta exportToJSON, THE Store SHALL serializar el Scene Graph completo a formato JSON
2. WHEN se serializa el árbol, THE Store SHALL recorrer todos los nodos y convertirlos al formato de Fabric.js
3. WHEN se exporta, THE Store SHALL incluir metadata de versión en el JSON resultante
4. THE Store SHALL filtrar propiedades internas que no deben exportarse
5. WHEN se completa la exportación, THE Store SHALL retornar un string JSON válido

### Requisito 16: Validación de Tipos en Runtime

**User Story:** Como desarrollador del sistema, quiero validar tipos de datos en runtime mediante Zod, para detectar errores de tipo que TypeScript no puede capturar en tiempo de compilación.

#### Criterios de Aceptación

1. WHEN se valida un nodo, THE Validation_Layer SHALL determinar el tipo de nodo y seleccionar el schema Zod apropiado
2. WHEN se valida un valor de propiedad, THE Validation_Layer SHALL usar el schema específico de esa propiedad
3. IF la validación falla, THEN THE Validation_Layer SHALL retornar un objeto ZodError con detalles descriptivos
4. WHEN se valida un GroupNode, THE Validation_Layer SHALL validar recursivamente todos los nodos hijos
5. THE Validation_Layer SHALL proporcionar inferencia automática de tipos TypeScript desde los schemas Zod

### Requisito 17: Manejo de Errores

**User Story:** Como usuario del sistema, quiero recibir mensajes de error claros cuando ocurren problemas, para entender qué salió mal y cómo corregirlo.

#### Criterios de Aceptación

1. WHEN se busca un nodo inexistente, THE Store SHALL lanzar NodeNotFoundError con el ID solicitado
2. WHEN falla una validación, THE Store SHALL lanzar el ZodError original con detalles de validación
3. WHEN se intenta una operación inválida, THE Store SHALL lanzar InvalidOperationError con descripción del problema
4. IF ocurre un error, THEN THE Store SHALL mantener el estado sin cambios (atomicidad)
5. THE Store SHALL registrar errores en consola durante desarrollo para facilitar debugging

### Requisito 18: Soporte de Gradientes y Sombras

**User Story:** Como usuario del editor, quiero aplicar gradientes y sombras a elementos, para crear efectos visuales avanzados.

#### Criterios de Aceptación

1. THE Store SHALL soportar fill como string (color sólido) o como objeto GradientFill
2. WHEN fill es un gradiente, THE Store SHALL validar que type sea 'linear' o 'radial'
3. WHEN fill es un gradiente, THE Store SHALL validar que colorStops sea un array con al menos un elemento
4. WHEN fill es un gradiente, THE Store SHALL validar que cada colorStop tenga offset entre 0 y 1
5. THE Store SHALL soportar shadow como objeto con propiedades color, blur, offsetX, offsetY
6. WHEN shadow está definido, THE Store SHALL validar que blur sea mayor o igual a 0
7. THE Store SHALL permitir shadow como null para elementos sin sombra

### Requisito 19: Control de Visibilidad y Bloqueo

**User Story:** Como usuario del editor, quiero controlar la visibilidad y capacidad de edición de elementos, para gestionar capas y proteger elementos del diseño.

#### Criterios de Aceptación

1. THE Store SHALL soportar la propiedad visible como booleano para mostrar/ocultar nodos
2. THE Store SHALL soportar la propiedad locked como booleano para prevenir edición de nodos
3. THE Store SHALL soportar la propiedad selectable como booleano para controlar si un nodo puede seleccionarse
4. THE Store SHALL soportar la propiedad evented como booleano para controlar si un nodo responde a eventos
5. WHEN un nodo tiene visible=false, THE Canvas_Renderer SHALL ocultar el Fabric_Object correspondiente

### Requisito 20: Búsqueda y Navegación del Árbol

**User Story:** Como desarrollador del sistema, quiero buscar nodos eficientemente y obtener información de su ubicación en el árbol, para implementar operaciones que requieren contexto jerárquico.

#### Criterios de Aceptación

1. WHEN se ejecuta findNodeById, THE Store SHALL buscar el nodo en el índice Map con complejidad O(1)
2. IF el nodo no existe, THEN findNodeById SHALL retornar null sin lanzar excepciones
3. WHEN se ejecuta getNodePath, THE Store SHALL retornar un array con los IDs desde root hasta el nodo especificado
4. THE Store SHALL mantener el índice _nodeIndex sincronizado con el árbol en todo momento
5. WHEN se modifica el árbol, THE Store SHALL actualizar el índice para reflejar los cambios

### Requisito 21: Persistencia de Estado

**User Story:** Como usuario del editor, quiero que mi trabajo se guarde automáticamente, para no perder cambios si cierro el navegador accidentalmente.

#### Criterios de Aceptación

1. THE Store SHALL utilizar el middleware persist de Zustand para persistir el estado
2. WHEN se persiste el estado, THE Store SHALL guardar solo la propiedad root (no historial ni índices)
3. THE Store SHALL almacenar el estado persistido en localStorage con la clave 'canvas-storage'
4. WHEN se inicializa el Store, THE Store SHALL cargar el estado persistido si existe
5. WHEN se carga estado persistido, THE Store SHALL reconstruir el índice _nodeIndex

### Requisito 22: Integración con DevTools

**User Story:** Como desarrollador del sistema, quiero inspeccionar el estado y las acciones del Store mediante DevTools, para facilitar debugging y desarrollo.

#### Criterios de Aceptación

1. THE Store SHALL utilizar el middleware devtools de Zustand
2. WHEN se ejecuta una acción, THE Store SHALL registrar la acción en Redux DevTools
3. THE Store SHALL permitir inspección del estado completo en DevTools
4. THE Store SHALL permitir time-travel debugging mediante DevTools
5. WHERE el entorno es producción, THE Store SHALL deshabilitar devtools automáticamente

### Requisito 23: Renderizado de Tipos de Nodos

**User Story:** Como desarrollador del sistema, quiero renderizar todos los tipos de nodos soportados en Fabric.js, para visualizar correctamente el Scene Graph completo.

#### Criterios de Aceptación

1. WHEN se renderiza un TextNode, THE Canvas_Renderer SHALL crear un fabric.Textbox con todas las propiedades tipográficas
2. WHEN se renderiza un RectNode, THE Canvas_Renderer SHALL crear un fabric.Rect con propiedades rx y ry
3. WHEN se renderiza un CircleNode, THE Canvas_Renderer SHALL crear un fabric.Circle con propiedad radius
4. WHEN se renderiza un PolygonNode, THE Canvas_Renderer SHALL crear un fabric.Polygon con el array de points
5. WHEN se renderiza un PathNode, THE Canvas_Renderer SHALL crear un fabric.Path con los comandos de path
6. WHEN se renderiza un GroupNode, THE Canvas_Renderer SHALL crear un fabric.Group conteniendo los Fabric_Objects de los hijos
7. WHEN se crea un Fabric_Object, THE Canvas_Renderer SHALL asignar el nodeId como propiedad 'id' del objeto
8. WHEN se crea un Fabric_Object, THE Canvas_Renderer SHALL almacenar la referencia en objectMap

### Requisito 24: Limpieza de Recursos

**User Story:** Como desarrollador del sistema, quiero liberar recursos correctamente cuando se desmonta el Canvas_Renderer, para prevenir memory leaks.

#### Criterios de Aceptación

1. WHEN se ejecuta dispose en Canvas_Renderer, THE Canvas_Renderer SHALL llamar a canvas.dispose() de Fabric.js
2. WHEN se ejecuta dispose, THE Canvas_Renderer SHALL limpiar el Map objectMap
3. WHEN se ejecuta dispose, THE Canvas_Renderer SHALL limpiar todos los listeners de eventos
4. WHEN se desmonta el componente React que usa useCanvasRenderer, THE hook SHALL llamar a dispose automáticamente

## Requisitos No Funcionales

### Requisito 25: Rendimiento de Actualización de Estado

**User Story:** Como usuario del editor, quiero que las operaciones de edición sean instantáneas, para tener una experiencia fluida sin retrasos perceptibles.

#### Criterios de Aceptación

1. WHEN se actualiza una propiedad de nodo, THE Store SHALL completar la operación en menos de 16ms (60fps)
2. WHEN se busca un nodo por ID, THE Store SHALL utilizar el índice Map para lograr complejidad O(1)
3. WHEN se clona el estado, THE Store SHALL implementar clonación estructural que solo clona el camino modificado
4. WHEN se realizan múltiples actualizaciones rápidas, THE Canvas_Renderer SHALL aplicar debouncing de 16ms para agrupar renders
5. WHEN el historial excede 50 estados, THE Store SHALL remover estados antiguos para limitar uso de memoria

### Requisito 26: Escalabilidad del Scene Graph

**User Story:** Como usuario del editor, quiero trabajar con diseños complejos que contengan muchos elementos, sin degradación significativa del rendimiento.

#### Criterios de Aceptación

1. THE Store SHALL soportar Scene Graphs con hasta 1000 nodos sin degradación perceptible
2. THE Store SHALL soportar árboles con profundidad máxima de 10 niveles
3. WHEN el número de nodos excede 1000, THE Validation_Layer SHALL rechazar la carga con error descriptivo
4. WHEN la profundidad excede 10 niveles, THE Validation_Layer SHALL rechazar la carga con error descriptivo
5. THE Store SHALL mantener el índice _nodeIndex sincronizado con complejidad O(1) por operación

### Requisito 27: Seguridad contra Inyección de Código

**User Story:** Como administrador del sistema, quiero prevenir inyección de código malicioso a través de propiedades de nodos, para proteger a los usuarios de ataques XSS.

#### Criterios de Aceptación

1. WHEN se carga contenido de texto desde fuentes externas, THE Store SHALL sanitizar el texto usando DOMPurify
2. WHEN se valida un PathNode, THE Validation_Layer SHALL validar estrictamente los comandos de path contra el schema
3. THE Store SHALL rechazar cualquier propiedad que no esté definida en los schemas Zod
4. THE Store SHALL prevenir ejecución de código JavaScript embebido en propiedades de texto
5. WHERE se permite contenido HTML, THE Store SHALL usar DOMPurify con configuración restrictiva (ALLOWED_TAGS vacío)

### Requisito 28: Seguridad contra Denegación de Servicio

**User Story:** Como administrador del sistema, quiero prevenir que JSON malicioso cause problemas de rendimiento o crashes, para mantener la estabilidad del sistema.

#### Criterios de Aceptación

1. WHEN se valida un Scene Graph, THE Validation_Layer SHALL verificar límites de profundidad (máximo 10 niveles)
2. WHEN se valida un Scene Graph, THE Validation_Layer SHALL verificar límites de número de nodos (máximo 1000)
3. WHEN la validación excede un timeout configurado, THE Validation_Layer SHALL abortar y lanzar error
4. THE Validation_Layer SHALL prevenir referencias circulares que causen loops infinitos
5. THE Store SHALL rechazar JSON con estructuras anidadas excesivamente complejas

### Requisito 29: Usabilidad de Mensajes de Error

**User Story:** Como usuario del editor, quiero recibir mensajes de error comprensibles cuando algo falla, para entender el problema y saber cómo resolverlo.

#### Criterios de Aceptación

1. WHEN falla una validación Zod, THE Store SHALL proporcionar mensajes descriptivos que indiquen la propiedad y el valor inválido
2. WHEN se lanza NodeNotFoundError, THE error SHALL incluir el ID del nodo que no se encontró
3. WHEN se lanza InvalidOperationError, THE error SHALL incluir una descripción clara de por qué la operación no es válida
4. THE Store SHALL registrar errores en consola durante desarrollo con stack traces completos
5. WHERE el entorno es producción, THE Store SHALL registrar errores sin exponer detalles internos sensibles

### Requisito 30: Compatibilidad con Fabric.js

**User Story:** Como desarrollador del sistema, quiero mantener compatibilidad con el formato JSON de Fabric.js, para permitir interoperabilidad con otras herramientas que usan Fabric.js.

#### Criterios de Aceptación

1. WHEN se exporta a JSON, THE Store SHALL generar un formato compatible con Fabric.js versión 7.x
2. WHEN se importa JSON de Fabric.js, THE Validation_Layer SHALL aceptar el formato estándar de Fabric.js
3. THE Store SHALL incluir la propiedad 'version' en el JSON exportado
4. THE Store SHALL preservar propiedades específicas de Fabric.js que no están en el schema base
5. WHEN se carga JSON de versiones anteriores de Fabric.js, THE Store SHALL aplicar migraciones si es necesario

### Requisito 31: Mantenibilidad del Código

**User Story:** Como desarrollador del sistema, quiero que el código sea mantenible y extensible, para facilitar la adición de nuevas funcionalidades y corrección de bugs.

#### Criterios de Aceptación

1. THE Store SHALL utilizar TypeScript con strict mode habilitado para máxima seguridad de tipos
2. THE Store SHALL utilizar Zod schemas como única fuente de verdad para validación y tipos
3. THE Store SHALL seguir el patrón de flujo unidireccional de datos (UI → Actions → State → Renderer)
4. THE Store SHALL mantener separación clara entre Store, Validation_Layer y Canvas_Renderer
5. THE código SHALL incluir comentarios JSDoc para todas las funciones públicas
6. THE código SHALL seguir convenciones de nomenclatura consistentes (camelCase para variables, PascalCase para tipos)

### Requisito 32: Testabilidad

**User Story:** Como desarrollador del sistema, quiero que el código sea fácilmente testeable, para mantener alta cobertura de tests y confianza en los cambios.

#### Criterios de Aceptación

1. THE Store SHALL ser testeable de forma aislada sin dependencias de UI o Canvas
2. THE Validation_Layer SHALL ser testeable de forma aislada con casos de entrada válidos e inválidos
3. THE Canvas_Renderer SHALL permitir inyección de dependencias para facilitar mocking en tests
4. THE código SHALL exponer funciones puras siempre que sea posible para facilitar testing unitario
5. THE Store SHALL proporcionar funciones helper para crear estados de prueba (createTestStore)

### Requisito 33: Accesibilidad de Hooks de React

**User Story:** Como desarrollador de UI, quiero hooks de React optimizados, para construir componentes eficientes que no re-rendericen innecesariamente.

#### Criterios de Aceptación

1. THE Store SHALL proporcionar useSelectedNode hook que solo re-renderiza cuando cambia la selección
2. THE Store SHALL proporcionar useNodeProperty hook que solo re-renderiza cuando cambia la propiedad específica
3. THE Store SHALL proporcionar useCanvasActions hook que retorna referencias estables (no causa re-renders)
4. THE hooks SHALL utilizar selectores de Zustand para optimizar re-renders
5. THE hooks SHALL seguir las reglas de hooks de React (llamarse en el nivel superior, no condicionalmente)

### Requisito 34: Documentación

**User Story:** Como desarrollador que usa el sistema, quiero documentación clara y completa, para entender cómo usar las APIs y extender el sistema.

#### Criterios de Aceptación

1. THE Store SHALL incluir comentarios JSDoc con ejemplos de uso para todas las acciones públicas
2. THE Validation_Layer SHALL documentar todos los schemas Zod con descripciones de cada campo
3. THE Canvas_Renderer SHALL documentar el ciclo de vida de sincronización entre estado y canvas
4. THE código SHALL incluir ejemplos de uso en comentarios para casos comunes
5. THE proyecto SHALL incluir un README con instrucciones de instalación y uso básico
