export default function CanvasEdges({ edges, nodes, selectedEdge, onSelectEdge, onDeleteEdge }) {
  const getNodeCenter = (nodeId, port) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const x = node.x + 104; // half of w-52 (208/2)
    const y = port === "bottom" ? node.y + 80 : node.y; // approximate heights
    return { x, y };
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
        </marker>
        <marker id="arrowhead-selected" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const from = getNodeCenter(edge.source, "bottom");
        const to = getNodeCenter(edge.target, "top");
        const isSelected = selectedEdge === edge.id;
        const midY = (from.y + to.y) / 2;
        const path = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;

        return (
          <g key={edge.id}>
            {/* Invisible fat line for click target */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              className="pointer-events-auto cursor-pointer"
              onClick={() => onSelectEdge(edge.id)}
            />
            <path
              d={path}
              fill="none"
              stroke={isSelected ? "#6366f1" : "#cbd5e1"}
              strokeWidth={isSelected ? 2.5 : 2}
              strokeDasharray={edge.condition ? "6 3" : undefined}
              markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
              className="pointer-events-none transition-colors"
            />
            {edge.condition && (
              <text x={(from.x + to.x) / 2} y={midY - 6} textAnchor="middle" className="pointer-events-none" fill="#94a3b8" fontSize="10">
                {edge.condition}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}