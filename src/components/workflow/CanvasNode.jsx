import { getNodeDef, CATEGORY_COLORS } from "./nodeTypes";
import { X, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CanvasNode({
  node,
  selected,
  onSelect,
  onDelete,
  onDragStart,
  onConnectStart,
  onConnectEnd,
  connectingFrom,
}) {
  const def = getNodeDef(node.type);
  const colors = CATEGORY_COLORS[def.categoryColor];
  const Icon = def.icon;

  return (
    <div
      className={cn(
        "absolute group select-none",
        "w-52 rounded-xl border-2 shadow-sm bg-white transition-shadow",
        selected ? `${colors.border} shadow-md ring-2 ${colors.ring} ring-offset-1` : "border-slate-200 hover:shadow-md"
      )}
      style={{ left: node.x, top: node.y }}
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/move-node", node.id);
        onDragStart?.(e, node);
      }}
    >
      {/* Header */}
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-[10px]", colors.bg)}>
        <GripHorizontal className="w-3 h-3 text-slate-300 cursor-grab" />
        <div className={cn("p-1 rounded-md", colors.iconBg)}>
          <Icon className={cn("w-3.5 h-3.5", colors.text)} />
        </div>
        <span className="text-xs font-semibold text-slate-800 flex-1 truncate">{node.label || def.label}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 transition-all"
        >
          <X className="w-3 h-3 text-red-400" />
        </button>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <div className="text-[10px] text-slate-400">{def.description}</div>
        {node.config?.url && (
          <div className="mt-1 text-[10px] text-slate-500 bg-slate-50 rounded px-1.5 py-0.5 truncate font-mono">{node.config.url}</div>
        )}
        {node.config?.prompt && (
          <div className="mt-1 text-[10px] text-slate-500 bg-slate-50 rounded px-1.5 py-0.5 truncate">{node.config.prompt}</div>
        )}
        {node.config?.to && (
          <div className="mt-1 text-[10px] text-slate-500 bg-slate-50 rounded px-1.5 py-0.5 truncate">{node.config.to}</div>
        )}
      </div>

      {/* Connection ports */}
      {!node.type.startsWith("trigger_") && (
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-slate-300 bg-white hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-colors z-10"
          onMouseUp={() => onConnectEnd?.(node.id)}
          title="Connect here"
        />
      )}
      <div
        className={cn(
          "absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-white cursor-pointer transition-colors z-10",
          connectingFrom === node.id ? "border-indigo-500 bg-indigo-100 scale-125" : "border-slate-300 hover:border-indigo-500 hover:bg-indigo-50"
        )}
        onMouseDown={(e) => { e.stopPropagation(); onConnectStart?.(node.id); }}
        title="Drag to connect"
      />
    </div>
  );
}