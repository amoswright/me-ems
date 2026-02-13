import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
} from '@xyflow/react';
import type { Node, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { parseMermaidToFlow } from '@/utils/parseMermaidToFlow';

console.log('🟢 ReactFlowDiagram module loaded!');

interface ReactFlowDiagramProps {
  content: string;
  id?: string;
}

// Custom node component for different shapes
function CustomNode({ data }: NodeProps) {
  const isDiamond = data.shape === 'diamond';

  // Hide the handle visuals but keep them functional
  const handleStyle = {
    background: 'transparent',
    border: 'none',
    width: '1px',
    height: '1px',
  };

  return (
    <>
      {/* Multiple connection handles for edges - invisible but functional */}
      {/* Top handles - both source and target for bidirectional arrows */}
      <Handle type="target" position={Position.Top} id="top-1" style={{ ...handleStyle, left: '25%' }} />
      <Handle type="source" position={Position.Top} id="top-1-src" style={{ ...handleStyle, left: '25%' }} />
      <Handle type="target" position={Position.Top} id="top-2" style={{ ...handleStyle, left: '50%' }} />
      <Handle type="source" position={Position.Top} id="top-2-src" style={{ ...handleStyle, left: '50%' }} />
      <Handle type="target" position={Position.Top} id="top-3" style={{ ...handleStyle, left: '75%' }} />
      <Handle type="source" position={Position.Top} id="top-3-src" style={{ ...handleStyle, left: '75%' }} />

      {/* Bottom handles - both source and target for bidirectional arrows */}
      <Handle type="source" position={Position.Bottom} id="bottom-1" style={{ ...handleStyle, left: '25%' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-1-tgt" style={{ ...handleStyle, left: '25%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-2" style={{ ...handleStyle, left: '50%' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-2-tgt" style={{ ...handleStyle, left: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-3" style={{ ...handleStyle, left: '75%' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-3-tgt" style={{ ...handleStyle, left: '75%' }} />

      {/* Left handles */}
      <Handle type="target" position={Position.Left} id="left-1" style={{ ...handleStyle, top: '25%' }} />
      <Handle type="target" position={Position.Left} id="left-2" style={{ ...handleStyle, top: '50%' }} />
      <Handle type="target" position={Position.Left} id="left-3" style={{ ...handleStyle, top: '75%' }} />

      {/* Right handles */}
      <Handle type="source" position={Position.Right} id="right-1" style={{ ...handleStyle, top: '25%' }} />
      <Handle type="source" position={Position.Right} id="right-2" style={{ ...handleStyle, top: '50%' }} />
      <Handle type="source" position={Position.Right} id="right-3" style={{ ...handleStyle, top: '75%' }} />

      <div
        className={`px-8 py-6 border-3 border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-white text-center font-semibold ${
          isDiamond ? 'rotate-45' : 'rounded-lg'
        }`}
        style={{
          width: isDiamond ? '220px' : '350px',
          maxWidth: isDiamond ? '220px' : '450px',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '15px',
          lineHeight: '1.4',
        }}
      >
        <div
          className={isDiamond ? '-rotate-45' : ''}
          style={{
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'normal',
            width: '100%',
          }}
        >
          {data.label}
        </div>
      </div>
    </>
  );
}

const nodeTypes = {
  default: CustomNode,
};

export function ReactFlowDiagram({ content }: ReactFlowDiagramProps) {
  console.log('🔵 ReactFlowDiagram rendering!', { contentLength: content?.length });

  const { nodes, edges } = useMemo(() => {
    console.warn('⚡ useMemo EXECUTING with content length:', content?.length);
    try {
      const result = parseMermaidToFlow(content);
      console.warn('⚡ Parser returned:', { nodeCount: result.nodes.length, edgeCount: result.edges.length });

      // Log first node and edge for inspection
      if (result.nodes.length > 0) {
        console.warn('⚡ First node:', JSON.stringify(result.nodes[0], null, 2));
      }
      if (result.edges.length > 0) {
        console.warn('⚡ First edge:', JSON.stringify(result.edges[0], null, 2));
      }

      return result;
    } catch (error) {
      console.error('❌ Error parsing Mermaid content:', error);
      return { nodes: [], edges: [] };
    }
  }, [content]);

  const onNodesChange = useCallback(() => {
    // Read-only diagram, no changes needed
  }, []);

  const onEdgesChange = useCallback(() => {
    // Read-only diagram, no changes needed
  }, []);

  if (nodes.length === 0) {
    console.error('❌ NO NODES PARSED! Content was:', content.substring(0, 200));
    return (
      <div className="my-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
        <p className="text-sm font-semibold text-red-800 dark:text-red-200">
          Unable to parse diagram
        </p>
      </div>
    );
  }

  return (
    <div className="my-4" style={{ height: '1200px', minHeight: '800px' }}>
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800" style={{ height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.05, minZoom: 0.8, maxZoom: 1.2 }}
          attributionPosition="bottom-left"
          minZoom={0.5}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'default',
            animated: false,
            pathOptions: { curvature: 0.5 },
            markerEnd: {
              type: 'arrowclosed',
              color: '#60a5fa',
              width: 25,
              height: 25,
            },
            style: { stroke: '#60a5fa', strokeWidth: 3 },
            labelStyle: {
              fontSize: 14,
              fontWeight: 600,
              fill: '#1f2937',
            },
            labelBgStyle: {
              fill: '#ffffff',
              fillOpacity: 0.98,
              strokeWidth: 1,
              stroke: '#e5e7eb',
            },
            labelBgPadding: [4, 12] as [number, number],
            labelBgBorderRadius: 4,
          }}
          connectionLineType="default"
          connectionLineStyle={{ stroke: '#60a5fa', strokeWidth: 3 }}
        >
          <Background color="#aaa" gap={16} />
          <Controls
            showInteractive={false}
            style={{
              button: {
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#1f2937'
              }
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
