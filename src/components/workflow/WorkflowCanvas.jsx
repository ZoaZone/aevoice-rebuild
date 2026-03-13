import { useState, useRef, useCallback } from "react";
import CanvasNode from "./CanvasNode";
import CanvasEdges from "./CanvasEdges";
import { getNodeDef } from "./nodeTypes";
import { cn } from "@/lib/utils";

export default function WorkflowCanvas({
  nodes,
  edges,
  selectedNode,
  selectedEdge,
  onSelectNode,
  onSelectEdge,
  onUpdateNode,
  onDeleteNode,
  onDeleteEdge,
  onAddNode,
  onAddEdge,
}) {
  const canvasRef = useRef(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData("application/node-type");
    const moveNodeId = e.dataTransfer.getData("application/move-node");
    const rect = canvasRef.current.getBoundingClientRect();

    if (nodeType) {
      const def = getNodeDef(nodeType);
      onAddNode({
        id: crypto.randomUUID(),
        type: nodeType,
        label: def.label,
        x: e.clientX - rect.left - 104,
        y: e.clientY - rect.top - 30,
        config: {},
      });
    } else if (moveNodeId) {
      onUpdateNode(moveNodeId, {
        x: Math.max(0, e.clientX - rect.left - 104),
        y: Math.max(0, e.clientY - rect.top - 30),
      });
    }
  }, [onAddNode, onUpdateNode]);

  const handleDragOver = (e) => e.preventDefault();

  const handleCanvasClick = () => {
    onSelectNode(null);
    onSelectEdge(null);
    setConnectingFrom(null);
  };

  const handleConnectStart = (nodeId) => setConnectingFrom(nodeId);
  const handleConnectEnd = (nodeId) => {
    if (connectingFrom && connectingFrom !== nodeId) {
      const exists = edges.some(e => e.source === connectingFrom && e.target === nodeId);
      if (!exists) {
        onAddEdge({ id: crypto.randomUUID(), source: connectingFrom, target: nodeId });
      }
    }
    setConnectingFrom(null);
  };

  return (
    <div
      ref={canvasRef}
      className={cn(
        "flex-1 relative overflow-auto bg-[#fafbfc]",
        "bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px]"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleCanvasClick}
      onKeyDown={(e) => {
        if ((e.key === "Delete" || e.key === "Backspace") && selectedEdge) onDeleteEdge(selectedEdge);
        if ((e.key === "Delete" || e.key === "Backspace") && selectedNode) onDeleteNode(selectedNode);
      }}
      tabIndex={0}
    >
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-lg font-medium text-slate-300 mb-1">Drag nodes here to start building</div>
            <div className="text-sm text-slate-300">Drop a trigger node to begin your workflow</div>
          </div>
        </div>
      )}

      <CanvasEdges
        edges={edges}
        nodes={nodes}
        selectedEdge={selectedEdge}
        onSelectEdge={onSelectEdge}
        onDeleteEdge={onDeleteEdge}
      />

      {nodes.map((node) => (
        <CanvasNode
          key={node.id}
          node={node}
          selected={selectedNode === node.id}
          onSelect={onSelectNode}
          onDelete={onDeleteNode}
          connectingFrom={connectingFrom}
          onConnectStart={handleConnectStart}
          onConnectEnd={handleConnectEnd}
        />
      ))}
    </div>
  );
}