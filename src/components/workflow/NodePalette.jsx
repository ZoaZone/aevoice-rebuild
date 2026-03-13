import { NODE_CATEGORIES, CATEGORY_COLORS } from "./nodeTypes";
import { GripVertical } from "lucide-react";

export default function NodePalette({ onDragStart }) {
  return (
    <div className="w-64 border-r border-slate-200 bg-white overflow-y-auto flex-shrink-0">
      <div className="p-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Node Library</h3>
      </div>
      <div className="p-2 space-y-4">
        {NODE_CATEGORIES.map((cat) => {
          const colors = CATEGORY_COLORS[cat.color];
          return (
            <div key={cat.label}>
              <div className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${colors.text} mb-1`}>
                {cat.label}
              </div>
              <div className="space-y-1">
                {cat.nodes.map((node) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/node-type", node.type);
                      onDragStart?.(node.type);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing border border-transparent hover:${colors.border} hover:${colors.bg} transition-all group`}
                  >
                    <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-400 flex-shrink-0" />
                    <div className={`p-1.5 rounded-md ${colors.iconBg} flex-shrink-0`}>
                      <node.icon className={`w-3.5 h-3.5 ${colors.text}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">{node.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{node.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}