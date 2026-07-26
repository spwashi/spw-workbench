/**
 * Geometry resolver — map AST nodes to structural sites and shapes.
 */

import type { ASTNode } from '../types'
import type { LabelPosition, LabelSite, LiminalShape } from './form-geometry'
import type { BoundaryLadderId } from './form-ladders'

/**
 * Resolve the structural position of an AST node.
 */
export function resolveLabelPosition(node: ASTNode, parents: ASTNode[]): LabelPosition {
  const depth = parents.length
  const parent = parents[parents.length - 1]

  // Default fallback
  const pos: LabelPosition = {
    site: 'free',
    liminal: 'exterior',
    depth
  }

  if (node.type === 'Identifier') {
    if (parent) {
      if (parent.type === 'Parameter') {
        pos.site = 'frame_param'
        pos.liminal = 'chamber'
        const grandParent = parents[parents.length - 2]
        if (grandParent?.type === 'Frame') {
          pos.boundary = 'frame'
        }
      } else if (parent.type === 'Operation') {
        pos.site = 'operator_adjacent'
        pos.liminal = 'aperture'
      } else if (parent.type === 'Reference') {
        pos.site = 'ref_handle'
        pos.liminal = 'published'
      } else if (parent.type === 'Annotation') {
        pos.site = 'register_meta'
        pos.liminal = 'published'
      } else if (parent.type === 'Capsule') {
        pos.site = 'capsule_tag'
        pos.liminal = 'membrane'
        pos.boundary = 'capsule'
      } else if (parent.type === 'Binding') {
        pos.site = 'facet_key'
        pos.liminal = 'chamber'
        const grandParent = parents[parents.length - 2]
        if (grandParent?.type === 'Body') {
          pos.boundary = 'body'
        }
      }
    }
  } else if (node.type === 'Literal') {
    if (parent?.type === 'PathRef') {
      pos.site = 'path_node'
      pos.liminal = 'exterior'
    }
  } else if (node.type === 'Annotation') {
    pos.site = 'register_meta'
    pos.liminal = 'published'
  } else if (node.type === 'Frame') {
    pos.site = 'frame_param'
    pos.liminal = 'void'
    pos.boundary = 'frame'
  } else if (node.type === 'Body') {
    pos.site = 'interior_term'
    pos.liminal = 'void'
    pos.boundary = 'body'
  }

  // Adjust liminality based on content
  if (node.children && node.children.length > 0) {
    if (pos.liminal === 'void') pos.liminal = 'chamber'
  }

  return pos
}
