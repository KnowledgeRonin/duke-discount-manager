// Canvas Editor Scene Graph — Public API
// ────────────────────────────────────────

// Types & Schemas
export type {
  SceneNode,
  GroupNode,
  TextNode,
  RectNode,
  CircleNode,
  LineNode,
  PolygonNode,
  PathNode,
  BaseNode,
  NodeType,
  GradientFill,
  Shadow,
  PathCommand,
  LayoutManager,
  HistoryState,
  FabricJSON,
} from './types'

export {
  SceneNodeSchema,
  GroupNodeSchema,
  TextNodeSchema,
  RectNodeSchema,
  CircleNodeSchema,
  LineNodeSchema,
  PolygonNodeSchema,
  PathNodeSchema,
  BaseNodeSchema,
  NodeTypeSchema,
  GradientFillSchema,
  ShadowSchema,
  PathCommandSchema,
  LayoutManagerSchema,
  NodeNotFoundError,
  InvalidOperationError,
  validateNode,
  validateTree,
  validateUniqueIds,
  validateTreeDepth,
  validateNodeCount,
  getSchemaForNodeType,
} from './types'

// Store
export {
  useCanvasStore,
  useSelectedNode,
  useNodeProperty,
  useCanvasActions,
} from './store'
export type { CanvasStore } from './store'

// Renderer
export { CanvasRenderer } from './CanvasRenderer'
export { useCanvasRenderer } from './useCanvasRenderer'

// SVG Parser
export {
  getFontConfig,
  collapseTspans,
  parseSVGToGroupNode,
} from './svgParser'
