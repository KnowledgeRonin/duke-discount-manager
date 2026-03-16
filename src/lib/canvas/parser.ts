import { nanoid } from 'nanoid'
import type { GroupNode, SceneNode } from './types'
import { validateTree } from './types'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/** Fabric.js node types that we support in the Scene Graph */
const SUPPORTED_TYPES = new Set([
  'group',
  'textbox',
  'rect',
  'circle',
  'line',
  'path',
  'polygon',
  'image',
])

/**
 * Properties from BaseNode that we extract from Fabric JSON.
 * Anything not in this list (or the type-specific lists below) is discarded.
 */
const BASE_PROPERTIES = [
  'id',
  'name',
  'type',
  'left',
  'top',
  'width',
  'height',
  'angle',
  'scaleX',
  'scaleY',
  'originX',
  'originY',
  'flipX',
  'flipY',
  'skewX',
  'skewY',
  'opacity',
  'visible',
  'fill',
  'stroke',
  'strokeWidth',
  'shadow',
  'selectable',
  'evented',
  'locked',
  'lockMovementX',
  'lockMovementY',
  'lockScalingX',
  'lockScalingY',
  'lockRotation',
  'hasControls',
  'hasBorders',
] as const

/** Extra properties per node type */
const TEXT_PROPERTIES = [
  'text',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'underline',
  'linethrough',
  'overline',
  'textTransform',
  'charSpacing',
  'lineHeight',
  'textAlign',
  'editable',
  'splitByGrapheme',
] as const

const RECT_PROPERTIES = ['rx', 'ry'] as const
const CIRCLE_PROPERTIES = ['radius'] as const
const LINE_PROPERTIES = ['x1', 'y1', 'x2', 'y2'] as const
const POLYGON_PROPERTIES = ['points'] as const
const PATH_PROPERTIES = ['path'] as const
const GROUP_PROPERTIES = ['objects', 'layoutManager'] as const

// ─────────────────────────────────────────────
// Default values for missing BaseNode properties
// ─────────────────────────────────────────────

const BASE_DEFAULTS: Record<string, unknown> = {
  name: '',
  left: 0,
  top: 0,
  width: 1,
  height: 1,
  angle: 0,
  scaleX: 1,
  scaleY: 1,
  originX: 'left',
  originY: 'top',
  flipX: false,
  flipY: false,
  skewX: 0,
  skewY: 0,
  opacity: 1,
  visible: true,
  fill: '#000000',
  stroke: null,
  strokeWidth: 0,
  shadow: null,
  selectable: true,
  evented: true,
  locked: false,
  lockMovementX: false,
  lockMovementY: false,
  lockScalingX: false,
  lockScalingY: false,
  lockRotation: false,
  hasControls: false,
  hasBorders: true,
}

const TEXT_DEFAULTS: Record<string, unknown> = {
  text: 'Text',
  fontFamily: 'Arial',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  underline: false,
  linethrough: false,
  overline: false,
  textTransform: 'none',
  charSpacing: 0,
  lineHeight: 1.16,
  textAlign: 'left',
  editable: true,
  splitByGrapheme: false,
}

const RECT_DEFAULTS: Record<string, unknown> = {
  rx: 0,
  ry: 0,
}

const CIRCLE_DEFAULTS: Record<string, unknown> = {
  radius: 50,
}

const LINE_DEFAULTS: Record<string, unknown> = {
  x1: 0,
  y1: 0,
  x2: 100,
  y2: 100,
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Parses a raw Fabric.js JSON export into a validated Scene Graph root node.
 *
 * Pipeline:
 * 1. Extracts the `objects` array from the JSON
 * 2. Recursively sanitizes each object (strip internal Fabric props, assign IDs)
 * 3. Wraps all top-level objects in a root GroupNode
 * 4. Validates the entire tree with `validateTree`
 *
 * @param json - Raw Fabric.js JSON (from `canvas.toJSON()` or an API response)
 * @returns A fully validated GroupNode ready for the store
 * @throws ZodError or Error if the resulting tree fails validation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadFromFabricJSON(json: any): GroupNode {
  // Step 1: Extract objects array
  const rawObjects = extractObjects(json)

  // Step 2: Sanitize each object recursively
  const sanitizedObjects = rawObjects.map((obj) => sanitizeNode(obj))

  // Step 3: Wrap in root GroupNode
  const rootNode: Record<string, unknown> = {
    id: nanoid(),
    name: 'Root',
    type: 'group',
    ...BASE_DEFAULTS,
    // Root takes canvas dimensions if available
    width: json.width ?? json.clipPath?.width ?? 800,
    height: json.height ?? json.clipPath?.height ?? 600,
    objects: sanitizedObjects,
  }

  // Step 4: Validate the full tree
  return validateTree(rootNode)
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

/**
 * Extracts the objects array from various JSON formats:
 * - `{ objects: [...] }` (standard Fabric.js export)
 * - `{ type: 'group', objects: [...] }` (a group node used as root)
 * - An array directly
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractObjects(json: any): any[] {
  if (Array.isArray(json)) return json

  if (json && typeof json === 'object') {
    // Standard Fabric JSON: { version, objects: [...] }
    if (Array.isArray(json.objects)) return json.objects

    // Single object — wrap in array
    if (json.type && SUPPORTED_TYPES.has(json.type)) return [json]
  }

  return []
}

/**
 * Recursively sanitizes a single Fabric.js object into a clean SceneNode shape:
 * - Assigns an `id` via nanoid if missing
 * - Picks only known properties (whitelist approach)
 * - Applies defaults for missing required properties
 * - Sanitizes `fill` (handles Fabric gradient objects)
 * - Sanitizes `shadow` (normalizes to our Shadow interface)
 * - Recursively processes children of groups
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeNode(raw: any): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid node: expected an object')
  }

  const type = raw.type as string

  // Resolve Fabric type aliases
  const resolvedType = resolveType(type)

  if (!SUPPORTED_TYPES.has(resolvedType)) {
    throw new Error(`Unsupported node type: "${type}"`)
  }

  // Start with base properties
  const node: Record<string, unknown> = {}

  // Pick base properties with defaults
  for (const prop of BASE_PROPERTIES) {
    if (prop === 'type') {
      node.type = resolvedType
    } else if (prop === 'id') {
      node.id = raw.id && typeof raw.id === 'string' && raw.id.length > 0
        ? raw.id
        : nanoid()
    } else if (prop === 'fill') {
      node.fill = sanitizeFill(raw.fill)
    } else if (prop === 'shadow') {
      node.shadow = sanitizeShadow(raw.shadow)
    } else {
      node[prop] = raw[prop] ?? BASE_DEFAULTS[prop]
    }
  }

  // Pick type-specific properties
  switch (resolvedType) {
    case 'textbox':
      for (const prop of TEXT_PROPERTIES) {
        node[prop] = raw[prop] ?? TEXT_DEFAULTS[prop]
      }
      // Ensure text is never empty (Zod requires min 1)
      if (!node.text || (typeof node.text === 'string' && node.text.length === 0)) {
        node.text = ' '
      }
      break

    case 'rect':
      for (const prop of RECT_PROPERTIES) {
        node[prop] = raw[prop] ?? RECT_DEFAULTS[prop]
      }
      break

    case 'circle':
      for (const prop of CIRCLE_PROPERTIES) {
        node[prop] = raw[prop] ?? CIRCLE_DEFAULTS[prop]
      }
      break

    case 'line':
      for (const prop of LINE_PROPERTIES) {
        node[prop] = raw[prop] ?? LINE_DEFAULTS[prop]
      }
      break

    case 'polygon':
      for (const prop of POLYGON_PROPERTIES) {
        node[prop] = raw[prop] ?? []
      }
      // Polygons need at least 3 points
      if (!Array.isArray(node.points) || (node.points as unknown[]).length < 3) {
        node.points = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }]
      }
      break

    case 'path':
      for (const prop of PATH_PROPERTIES) {
        node[prop] = raw[prop] ?? []
      }
      // Paths need at least one command starting with M
      if (!Array.isArray(node.path) || (node.path as unknown[]).length === 0) {
        node.path = [['M', 0, 0]]
      }
      break

    case 'group':
      // Recursively sanitize children
      const rawChildren = Array.isArray(raw.objects) ? raw.objects : []
      node.objects = rawChildren.map((child: unknown) => sanitizeNode(child))

      // Handle layoutManager if present
      if (raw.layoutManager && typeof raw.layoutManager === 'object') {
        node.layoutManager = sanitizeLayoutManager(raw.layoutManager)
      }
      break
  }

  // Ensure width and height are positive (Zod requires positive())
  if (typeof node.width === 'number' && node.width <= 0) node.width = 1
  if (typeof node.height === 'number' && node.height <= 0) node.height = 1
  if (typeof node.scaleX === 'number' && node.scaleX <= 0) node.scaleX = 1
  if (typeof node.scaleY === 'number' && node.scaleY <= 0) node.scaleY = 1

  return node
}

/**
 * Resolves Fabric.js type names to our supported NodeType values.
 * Fabric uses 'i-text' and 'text' which we map to 'textbox'.
 */
function resolveType(type: string): string {
  const lowerType = type.toLowerCase()
  switch (lowerType) {
    case 'i-text':
    case 'text':
      return 'textbox'
    default:
      return lowerType
  }
}

/**
 * Sanitizes a Fabric `fill` value:
 * - String colors pass through
 * - Fabric gradient objects → our GradientFill shape
 * - null/undefined → default color
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeFill(fill: any): string | Record<string, unknown> {
  if (fill === null || fill === undefined) return BASE_DEFAULTS.fill as string

  if (typeof fill === 'string') return fill

  // Fabric gradient object: { type, coords, colorStops }
  if (typeof fill === 'object' && fill.type && fill.colorStops) {
    return {
      type: fill.type === 'radial' ? 'radial' : 'linear',
      coords: {
        x1: fill.coords?.x1 ?? 0,
        y1: fill.coords?.y1 ?? 0,
        x2: fill.coords?.x2 ?? 1,
        y2: fill.coords?.y2 ?? 0,
        ...(fill.type === 'radial' ? {
          r1: fill.coords?.r1 ?? 0,
          r2: fill.coords?.r2 ?? 1,
        } : {}),
      },
      colorStops: Array.isArray(fill.colorStops)
        ? fill.colorStops.map((stop: { offset?: number; color?: string }) => ({
          offset: stop.offset ?? 0,
          color: stop.color ?? '#000000',
        }))
        : [{ offset: 0, color: '#000000' }, { offset: 1, color: '#FFFFFF' }],
    }
  }

  return BASE_DEFAULTS.fill as string
}

/**
 * Sanitizes a Fabric `shadow` value:
 * - null/undefined → null
 * - Fabric Shadow object → our Shadow shape
 * - Shadow string (e.g. "5px 5px 10px rgba(0,0,0,0.5)") → parsed manually
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeShadow(shadow: any): Record<string, unknown> | null {
  if (!shadow) return null

  if (typeof shadow === 'object') {
    return {
      color: shadow.color ?? 'rgba(0,0,0,0.5)',
      blur: typeof shadow.blur === 'number' ? Math.max(0, shadow.blur) : 0,
      offsetX: shadow.offsetX ?? 0,
      offsetY: shadow.offsetY ?? 0,
    }
  }

  // Fabric sometimes stores shadow as a string — parse it
  if (typeof shadow === 'string' && shadow.length > 0) {
    // Simple pattern: "offsetX offsetY blur color"
    const parts = shadow.trim().split(/\s+/)
    return {
      color: parts.slice(3).join(' ') || 'rgba(0,0,0,0.5)',
      blur: parseFloat(parts[2]) || 0,
      offsetX: parseFloat(parts[0]) || 0,
      offsetY: parseFloat(parts[1]) || 0,
    }
  }

  return null
}

/**
 * Sanitizes a Fabric layoutManager config.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeLayoutManager(lm: any): Record<string, unknown> | undefined {
  if (!lm || typeof lm !== 'object') return undefined

  const strategy = lm.strategy ?? lm.type
  const validStrategies = ['fit-content', 'fixed', 'clip']

  if (typeof strategy === 'string' && validStrategies.includes(strategy)) {
    return {
      type: 'layoutManager',
      strategy,
    }
  }

  return undefined
}
