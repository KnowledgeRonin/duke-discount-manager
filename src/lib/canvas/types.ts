import { z } from 'zod'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

export const MAX_TREE_DEPTH = 10
export const MAX_NODE_COUNT = 1000

// ─────────────────────────────────────────────
// Auxiliary Schemas
// ─────────────────────────────────────────────

export const GradientFillSchema = z.object({
  type: z.enum(['linear', 'radial']),
  coords: z.object({
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
    r1: z.number().optional(),
    r2: z.number().optional(),
  }),
  colorStops: z.array(
    z.object({
      offset: z.number().min(0).max(1),
      color: z.string(),
    })
  ),
})

export const ShadowSchema = z.object({
  color: z.string(),
  blur: z.number().min(0),
  offsetX: z.number(),
  offsetY: z.number(),
})

// ─────────────────────────────────────────────
// Node Type Enum
// ─────────────────────────────────────────────

export const NodeTypeSchema = z.enum([
  'group',
  'textbox',
  'rect',
  'circle',
  'line',
  'path',
  'polygon',
  'image',
])

// ─────────────────────────────────────────────
// Base Node Schema
// ─────────────────────────────────────────────

export const BaseNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  type: NodeTypeSchema,

  // Geometry
  left: z.number(),
  top: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  angle: z.number().min(-360).max(360),
  scaleX: z.number().positive(),
  scaleY: z.number().positive(),

  // Transforms
  originX: z.enum(['left', 'center', 'right']),
  originY: z.enum(['top', 'center', 'bottom']),
  flipX: z.boolean(),
  flipY: z.boolean(),
  skewX: z.number(),
  skewY: z.number(),

  // Visual style
  opacity: z.number().min(0).max(1),
  visible: z.boolean(),
  fill: z.union([z.string(), GradientFillSchema]),
  stroke: z.string().nullable(),
  strokeWidth: z.number().min(0),
  strokeDashArray: z.array(z.number()).nullable().optional(),
  shadow: ShadowSchema.nullable(),

  // Lock properties
  lockMovementX: z.boolean().optional(),
  lockMovementY: z.boolean().optional(),
  lockScalingX: z.boolean().optional(),
  lockScalingY: z.boolean().optional(),
  lockRotation: z.boolean().optional(),
  hasControls: z.boolean().optional(),
  hasBorders: z.boolean().optional(),

  // Metadata
  selectable: z.boolean(),
  evented: z.boolean(),
  locked: z.boolean(),
})

// ─────────────────────────────────────────────
// TextNode Schema
// ─────────────────────────────────────────────

export const TextNodeSchema = BaseNodeSchema.extend({
  type: z.literal('textbox'),
  text: z.string().min(1),

  // Font style
  fontFamily: z.string(),
  fontSize: z.number().min(1).max(500),
  fontWeight: z.union([
    z.enum(['normal', 'bold']),
    z.number().min(100).max(900).multipleOf(100),
  ]),
  fontStyle: z.enum(['normal', 'italic']),

  // Decoration
  underline: z.boolean(),
  linethrough: z.boolean(),
  overline: z.boolean(),

  // Text transform
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']),

  // Spacing
  charSpacing: z.number().min(-200).max(800),
  lineHeight: z.number().min(0.5).max(3.0),

  // Alignment
  textAlign: z.enum(['left', 'center', 'right', 'justify']),

  // Behavior
  editable: z.boolean(),
  splitByGrapheme: z.boolean(),
})

// ─────────────────────────────────────────────
// Shape Node Schemas
// ─────────────────────────────────────────────

export const RectNodeSchema = BaseNodeSchema.extend({
  type: z.literal('rect'),
  rx: z.number().min(0),
  ry: z.number().min(0),
})

export const CircleNodeSchema = BaseNodeSchema.extend({
  type: z.literal('circle'),
  radius: z.number().positive(),
})

export const LineNodeSchema = BaseNodeSchema.extend({
  type: z.literal('line'),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
})

export const PolygonNodeSchema = BaseNodeSchema.extend({
  type: z.literal('polygon'),
  points: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
      })
    )
    .min(3),
})

// ─────────────────────────────────────────────
// PathNode Schema
// ─────────────────────────────────────────────

const MoveToCommand = z.tuple([z.literal('M'), z.number(), z.number()])
const LineToCommand = z.tuple([z.literal('L'), z.number(), z.number()])
const CubicBezierCommand = z.tuple([
  z.literal('C'),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
])
const QuadraticBezierCommand = z.tuple([
  z.literal('Q'),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
])
const ClosePathCommand = z.tuple([z.literal('Z')])

export const PathCommandSchema = z.union([
  MoveToCommand,
  LineToCommand,
  CubicBezierCommand,
  QuadraticBezierCommand,
  ClosePathCommand,
])

export const PathNodeSchema = BaseNodeSchema.extend({
  type: z.literal('path'),
  path: z
    .array(PathCommandSchema)
    .min(1)
    .refine((path) => path[0][0] === 'M', {
      message: 'Path must start with MoveTo (M) command',
    }),
})

// ─────────────────────────────────────────────
// GroupNode Schema (Recursive)
// ─────────────────────────────────────────────

export const LayoutManagerSchema = z.object({
  type: z.literal('layoutManager'),
  strategy: z.enum(['fit-content', 'fixed', 'clip']),
})

// Forward-declare for recursive reference
export const GroupNodeSchema: z.ZodType<GroupNode> = BaseNodeSchema.extend({
  type: z.literal('group'),
  objects: z.lazy(() => z.array(SceneNodeSchema)),
  layoutManager: LayoutManagerSchema.optional(),
}) as z.ZodType<GroupNode>

// ─────────────────────────────────────────────
// Union: SceneNode
// ─────────────────────────────────────────────

// Using z.union instead of z.discriminatedUnion to support the recursive GroupNodeSchema
export const SceneNodeSchema: z.ZodType<SceneNode> = z.union([
  TextNodeSchema,
  RectNodeSchema,
  CircleNodeSchema,
  LineNodeSchema,
  PolygonNodeSchema,
  PathNodeSchema,
  z.lazy(() => GroupNodeSchema),
])

// ─────────────────────────────────────────────
// Inferred TypeScript Types
// ─────────────────────────────────────────────

export type NodeType = z.infer<typeof NodeTypeSchema>
export type GradientFill = z.infer<typeof GradientFillSchema>
export type Shadow = z.infer<typeof ShadowSchema>
export type BaseNode = z.infer<typeof BaseNodeSchema>
export type TextNode = z.infer<typeof TextNodeSchema>
export type RectNode = z.infer<typeof RectNodeSchema>
export type CircleNode = z.infer<typeof CircleNodeSchema>
export type LineNode = z.infer<typeof LineNodeSchema>
export type PolygonNode = z.infer<typeof PolygonNodeSchema>
export type PathCommand = z.infer<typeof PathCommandSchema>
export type PathNode = z.infer<typeof PathNodeSchema>
export type LayoutManager = z.infer<typeof LayoutManagerSchema>

// GroupNode and SceneNode need explicit interfaces for the recursive reference
export interface GroupNode extends BaseNode {
  type: 'group'
  objects: SceneNode[]
  layoutManager?: LayoutManager
}

export type SceneNode =
  | TextNode
  | RectNode
  | CircleNode
  | LineNode
  | PolygonNode
  | PathNode
  | GroupNode

// ─────────────────────────────────────────────
// History & Fabric JSON Types
// ─────────────────────────────────────────────

export interface HistoryState {
  past: GroupNode[]
  present: GroupNode
  future: GroupNode[]
  maxSize: number
}

export interface FabricJSON {
  version: string
  objects: unknown[]
  [key: string]: unknown
}

// ─────────────────────────────────────────────
// Custom Error Classes
// ─────────────────────────────────────────────

export class NodeNotFoundError extends Error {
  constructor(nodeId: string) {
    super(`Node with id "${nodeId}" not found in Scene Graph`)
    this.name = 'NodeNotFoundError'
  }
}

export class InvalidOperationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidOperationError'
  }
}

// ─────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────

/**
 * Validates a single node against its schema based on the `type` discriminant.
 * Throws ZodError if invalid.
 */
export function validateNode(node: unknown): SceneNode {
  return SceneNodeSchema.parse(node)
}

/**
 * Validates an entire Scene Graph tree starting from a root GroupNode.
 * Also enforces structural constraints: unique IDs, max depth, max node count.
 * Throws ZodError or Error if any constraint is violated.
 */
export function validateTree(root: unknown): GroupNode {
  const validated = GroupNodeSchema.parse(root)

  validateUniqueIds(validated)
  validateTreeDepth(validated)
  validateNodeCount(validated)

  return validated
}

/**
 * Ensures every node in the tree has a unique `id`.
 * Throws Error with the duplicate id if a duplicate is found.
 */
export function validateUniqueIds(root: GroupNode): void {
  const ids = new Set<string>()

  function traverse(node: SceneNode): void {
    if (ids.has(node.id)) {
      throw new Error(`Duplicate node id: ${node.id}`)
    }
    ids.add(node.id)

    if (node.type === 'group') {
      node.objects.forEach(traverse)
    }
  }

  traverse(root)
}

/**
 * Ensures the tree does not exceed `MAX_TREE_DEPTH` levels of nesting.
 * Throws Error if the depth limit is exceeded.
 */
export function validateTreeDepth(
  root: GroupNode,
  maxDepth: number = MAX_TREE_DEPTH
): void {
  function traverse(node: SceneNode, depth: number): void {
    if (depth > maxDepth) {
      throw new Error(`Tree depth exceeds maximum of ${maxDepth}`)
    }

    if (node.type === 'group') {
      node.objects.forEach((child) => traverse(child, depth + 1))
    }
  }

  traverse(root, 0)
}

/**
 * Ensures the total number of nodes does not exceed `MAX_NODE_COUNT`.
 * Throws Error if the count limit is exceeded.
 */
export function validateNodeCount(
  root: GroupNode,
  maxCount: number = MAX_NODE_COUNT
): void {
  let count = 0

  function traverse(node: SceneNode): void {
    count++
    if (count > maxCount) {
      throw new Error(`Node count exceeds maximum of ${maxCount}`)
    }

    if (node.type === 'group') {
      node.objects.forEach(traverse)
    }
  }

  traverse(root)
}

/**
 * Returns the appropriate Zod schema for a given node type.
 * Useful for per-property validation when updating individual fields.
 */
export function getSchemaForNodeType(type: NodeType): z.ZodType<SceneNode> {
  switch (type) {
    case 'textbox':
      return TextNodeSchema
    case 'rect':
      return RectNodeSchema
    case 'circle':
      return CircleNodeSchema
    case 'line':
      return LineNodeSchema
    case 'polygon':
      return PolygonNodeSchema
    case 'path':
      return PathNodeSchema
    case 'group':
      return GroupNodeSchema
    default:
      throw new Error(`Unknown node type: ${type}`)
  }
}
