import type { Node, Edge } from '@xyflow/react';
import dagre from 'dagre';

interface MermaidNode {
  id: string;
  label: string;
  shape: 'rectangle' | 'diamond' | 'rounded' | 'circle';
}

interface MermaidEdge {
  from: string;
  to: string;
  label?: string;
}

// Helper function to create edge with bidirectional handling
function createEdge(
  edge: MermaidEdge,
  index: number,
  isBidirectional: boolean,
  isForwardDirection: boolean
): Edge {
  const baseEdge = {
    id: `e${index}`,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    animated: false,
    type: 'default' as const,
  };

  if (!isBidirectional) {
    // Normal edges - use standard bottom to top flow
    return {
      ...baseEdge,
      sourceHandle: 'bottom-2',
      targetHandle: 'top-2',
    };
  }

  // For bidirectional edges, use different handles
  if (isForwardDirection) {
    // Forward direction - left side going down (bottom to top)
    return {
      ...baseEdge,
      sourceHandle: 'bottom-1',
      targetHandle: 'top-1',
    };
  }

  // Reverse direction - right side going back up (top to bottom)
  return {
    ...baseEdge,
    sourceHandle: 'top-3-src',
    targetHandle: 'bottom-3-tgt',
  };
}

export function parseMermaidToFlow(mermaidContent: string): { nodes: Node[]; edges: Edge[] } {
  console.log('📊 Parsing Mermaid content:', mermaidContent.substring(0, 100) + '...');
  const lines = mermaidContent.trim().split('\n').filter(line => line.trim());
  const mermaidNodes = new Map<string, MermaidNode>();
  const mermaidEdges: MermaidEdge[] = [];

  // Skip the first line (graph TD or similar)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Parse node definitions and edges
    // Format: A[Label] or A{Label} or A((Label)) or A(Label)
    // Edge formats: A --> B or A -->|label| B or A -- label --> B

    if (line.includes('-->') || line.includes('---')) {
      let edgeMatch;
      let from: string, to: string, label: string | undefined;

      // Try format with pipes: A[label] -->|edgeLabel| B[label]
      // Account for optional node definitions [...]
      edgeMatch = line.match(/(\w+)(?:[\[\{\(][^\]\}\)]*[\]\}\)])?\s*--+>\s*\|([^|]+)\|\s*(\w+)/);
      if (edgeMatch) {
        [, from, label, to] = edgeMatch;
        // Remove quotes from label
        const cleanLabel = label?.trim().replace(/^["']|["']$/g, '');
        mermaidEdges.push({ from, to, label: cleanLabel });
      } else {
        // Try format with text between dashes: A[label] -- text ---> B[label]
        // Handles both --> and ---> (and more dashes)
        edgeMatch = line.match(/(\w+)(?:[\[\{\(][^\]\}\)]*[\]\}\)])?\s*--\s+(.+?)\s+--+>\s*(\w+)/);
        if (edgeMatch) {
          [, from, label, to] = edgeMatch;
          // Remove quotes from label
          const cleanLabel = label?.trim().replace(/^["']|["']$/g, '');
          mermaidEdges.push({ from, to, label: cleanLabel });
        } else {
          // Try format with no label: A[label] --> B[label]
          edgeMatch = line.match(/(\w+)(?:[\[\{\(][^\]\}\)]*[\]\}\)])?\s*--+>\s*(\w+)/);
          if (edgeMatch) {
            [, from, to] = edgeMatch;
            mermaidEdges.push({ from, to, label: undefined });
          }
        }
      }
    }

    // Parse node definitions
    const nodeMatches = line.matchAll(/(\w+)([\[\{\(\(])(.*?)([\]\}\)\)])/g);
    for (const match of nodeMatches) {
      const [, id, openBracket, label] = match;
      if (!mermaidNodes.has(id)) {
        let shape: 'rectangle' | 'diamond' | 'rounded' | 'circle' = 'rectangle';
        if (openBracket === '{') shape = 'diamond';
        else if (openBracket === '((' || openBracket === '(') shape = 'rounded';

        mermaidNodes.set(id, { id, label, shape });
      }
    }
  }

  console.log('📊 Found nodes:', Array.from(mermaidNodes.keys()));
  console.log('📊 Found edges:', mermaidEdges.map(e => `${e.from}->${e.to}`));
  console.table(mermaidEdges); // Show edges in a table for better visibility

  // Convert to React Flow format
  const nodes: Node[] = Array.from(mermaidNodes.values()).map(node => ({
    id: node.id,
    type: node.shape === 'diamond' ? 'default' : 'default',
    data: {
      label: node.label,
      shape: node.shape
    },
    position: { x: 0, y: 0 }, // Will be set by layout
    style: {
      background: 'transparent',
      border: 'none',
      padding: 0,
      width: 'auto',
      height: 'auto',
    },
  }));

  console.log('📊 All node labels:', nodes.map(n => `${n.id}: "${n.data.label}"`).join('\n'));

  // Filter out edges that reference non-existent nodes
  const validEdges = mermaidEdges.filter(edge => {
    // Check for undefined/null values
    if (!edge.from || !edge.to) {
      console.error(`❌ Invalid edge with undefined nodes: from=${edge.from}, to=${edge.to}`);
      return false;
    }

    const hasSource = mermaidNodes.has(edge.from);
    const hasTarget = mermaidNodes.has(edge.to);
    if (!hasSource || !hasTarget) {
      console.warn(`⚠️ Skipping edge ${edge.from} -> ${edge.to}: missing node ${!hasSource ? edge.from : edge.to}`);
      return false;
    }
    return true;
  });

  // Detect bidirectional edges (edges that go both ways between two nodes)
  const bidirectionalPairs = new Set<string>();
  const edgeMap = new Map<string, number>();

  validEdges.forEach((edge, index) => {
    const key = `${edge.from}-${edge.to}`;
    const reverseKey = `${edge.to}-${edge.from}`;

    if (edgeMap.has(reverseKey)) {
      // Found a bidirectional pair
      bidirectionalPairs.add(key);
      bidirectionalPairs.add(reverseKey);
    }
    edgeMap.set(key, index);
  });

  // Create edges with smart handle assignment for bidirectional edges
  const edges: Edge[] = validEdges.map((edge, index) => {
    const key = `${edge.from}-${edge.to}`;
    const isBidirectional = bidirectionalPairs.has(key);

    let isForwardDirection = false;
    if (isBidirectional) {
      const reverseKey = `${edge.to}-${edge.from}`;
      const reverseIndex = edgeMap.get(reverseKey);
      isForwardDirection = reverseIndex !== undefined && index < reverseIndex;
    }

    const baseEdge = createEdge(edge, index, isBidirectional, isForwardDirection);

    // Special routing for specific edges to go through left side
    // "Inadequate" edge should use left-side handles
    if (edge.label === 'Inadequate' && edge.from === 'A' && edge.to === 'C') {
      return {
        ...baseEdge,
        sourceHandle: 'bottom-1',
        targetHandle: 'top-1',
      };
    }

    // Reverse flow "Successful" edge from D to A should use leftmost handles
    if (edge.label === 'Successful' && edge.from === 'D' && edge.to === 'A') {
      return {
        ...baseEdge,
        sourceHandle: 'top-1-src',  // Top-left of D
        targetHandle: 'bottom-1-tgt',  // Bottom-left of A
      };
    }

    return baseEdge;
  });

  // Apply dagre layout
  return applyDagreLayout(nodes, edges);
}

function applyDagreLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'TB',
    nodesep: 150,    // Increased horizontal spacing between nodes
    ranksep: 200,    // Increased vertical spacing between ranks
    marginx: 50,     // Add margin around the graph
    marginy: 50
  });

  // Nodes to force to specific ranks for better layout
  const topRankLabels = [
    'Continue BVM or CPAP'
  ];

  const lowerRankLabels = [
    'All Clinicians Airway Obstruction Procedures Paramedic Direct Laryngoscopy',
    'AEMT/Paramedic Blind Insertion Airway Device or Paramedic Intubation'
  ];

  // Add nodes to dagre with larger dimensions
  nodes.forEach(node => {
    const isDiamond = node.data.shape === 'diamond';
    const nodeConfig: any = {
      width: isDiamond ? 220 : 350,   // Match CustomNode width
      height: 120   // Increased height for multi-line text
    };

    // Force specific nodes to top rank for better visibility
    if (topRankLabels.includes(String(node.data.label))) {
      console.log('📌 Setting rank 1 for:', node.data.label);
      nodeConfig.rank = 1;  // Top level
    }
    // Force specific nodes to a lower rank to make diagram narrower
    else if (lowerRankLabels.includes(String(node.data.label))) {
      console.log('📌 Setting rank 4 for:', node.data.label);
      nodeConfig.rank = 4;  // Higher rank number = lower position in TB layout
    }

    dagreGraph.setNode(node.id, nodeConfig);
  });

  // Add edges to dagre
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply positions back to nodes
  const layoutedNodes = nodes.map(node => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isDiamond = node.data.shape === 'diamond';
    const width = isDiamond ? 220 : 350;
    const height = 120;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,  // Center the node
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  // Manually adjust positions for nodes that Dagre couldn't place correctly due to edge constraints
  // Find the top-level Y position (node A)
  const topNode = layoutedNodes.find(n => n.id === 'A');
  const topY = topNode?.position.y ?? 50;

  // Force "Continue BVM or CPAP" to top level
  const gNode = layoutedNodes.find(n => n.data.label === 'Continue BVM or CPAP');
  const manuallyRepositionedNodes = new Set<string>();

  if (gNode) {
    console.log('🔧 Manually moving "Continue BVM or CPAP" to top level, Y:', topY);
    gNode.position.y = topY;
    gNode.position.x = (topNode?.position.x ?? 0) + 400; // Position it to the right of A
    manuallyRepositionedNodes.add(gNode.id);
  }

  // Group nodes by Y position to identify ranks
  const nodesByY = new Map<number, typeof layoutedNodes>();
  layoutedNodes.forEach(node => {
    const y = Math.round(node.position.y / 50) * 50; // Round to nearest 50 to group nodes at same rank
    if (!nodesByY.has(y)) {
      nodesByY.set(y, []);
    }
    nodesByY.get(y)!.push(node);
  });

  // Find rank 3 nodes (third Y level from top)
  const yLevels = Array.from(nodesByY.keys()).sort((a, b) => a - b);
  if (yLevels.length >= 3) {
    const rank3Y = yLevels[2]; // Third level (0-indexed)
    const rank3Nodes = nodesByY.get(rank3Y) || [];

    if (rank3Nodes.length > 0) {
      console.log('🔧 Adjusting rank 3 nodes:', rank3Nodes.map(n => n.data.label));

      // Calculate current center X of rank 3 nodes
      const currentCenterX = rank3Nodes.reduce((sum, n) => sum + n.position.x, 0) / rank3Nodes.length;

      // Shift left by 100px and bring closer together
      const leftShift = 100;
      const spacingReduction = 0.7; // Reduce spacing to 70% of original

      // Sort nodes by X position
      const sortedNodes = [...rank3Nodes].sort((a, b) => a.position.x - b.position.x);

      // Calculate new positions with reduced spacing
      const newCenterX = currentCenterX - leftShift;
      const totalWidth = (sortedNodes[sortedNodes.length - 1].position.x - sortedNodes[0].position.x) * spacingReduction;
      const startX = newCenterX - totalWidth / 2;

      sortedNodes.forEach((node, index) => {
        if (sortedNodes.length > 1) {
          node.position.x = startX + (totalWidth * index / (sortedNodes.length - 1));
        } else {
          node.position.x = newCenterX;
        }
        console.log(`   📍 ${node.data.label}: X = ${Math.round(node.position.x)}`);
      });
    }
  }

  // Create a position map for quick lookup
  const nodePositions = new Map(
    layoutedNodes.map(node => [node.id, node.position.y])
  );

  // Adjust edge handles based on actual positions
  // If source is below target (higher Y), use top-to-bottom handles for reverse flow
  const adjustedEdges = edges.map(edge => {
    const sourceY = nodePositions.get(edge.source) ?? 0;
    const targetY = nodePositions.get(edge.target) ?? 0;

    // Special handling for edges connected to manually repositioned nodes
    if (manuallyRepositionedNodes.has(edge.source) || manuallyRepositionedNodes.has(edge.target)) {
      // Check if this is a bidirectional edge
      if (edge.sourceHandle === 'bottom-1' || edge.sourceHandle === 'top-3-src') {
        // For bidirectional edges connected to repositioned nodes, swap handles based on new positions
        if (sourceY > targetY) {
          // Source is below target - arrow goes from top of source to bottom of target
          if (edge.sourceHandle === 'bottom-1') {
            return {
              ...edge,
              sourceHandle: 'top-1-src',
              targetHandle: 'bottom-1-tgt',
            };
          } else if (edge.sourceHandle === 'top-3-src') {
            return {
              ...edge,
              sourceHandle: 'bottom-3',
              targetHandle: 'top-3',
            };
          }
        } else {
          // Source is above target - arrow goes from bottom of source to top of target
          if (edge.sourceHandle === 'bottom-1') {
            return {
              ...edge,
              sourceHandle: 'bottom-1',
              targetHandle: 'top-1',
            };
          } else if (edge.sourceHandle === 'top-3-src') {
            return {
              ...edge,
              sourceHandle: 'bottom-3',
              targetHandle: 'top-3',
            };
          }
        }
      }
    }

    // Skip adjustment for bidirectional edges (they already have custom handles)
    if (edge.sourceHandle === 'bottom-1' || edge.sourceHandle === 'top-3-src') {
      return edge;
    }

    // Check if this is a reverse flow (source below target)
    if (sourceY > targetY) {
      // Reverse flow: use top of source to bottom of target
      return {
        ...edge,
        sourceHandle: 'top-3-src',
        targetHandle: 'bottom-3-tgt',
      };
    }

    return edge;
  });

  return { nodes: layoutedNodes, edges: adjustedEdges };
}
