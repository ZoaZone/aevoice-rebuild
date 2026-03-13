import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Minus, MessageSquare } from "lucide-react";

/**
 * SreeFloatingWidget - Draggable floating chat widget with minimize support
 * Features:
 * - Draggable positioning
 * - Minimize/maximize functionality  
 * - Position persistence in localStorage
 * - TEXT CHAT button when minimized
 * - Sree greeting message
 */
export default function SreeFloatingWidget({ onClose, agentId, agentConfig }) {
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('sreeWidgetPosition');
    return saved ? JSON.parse(saved) : { x: 100, y: 100 };
  });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef(null);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('sreeWidgetPosition', JSON.stringify(position));
  }, [position]);

  const handlePointerDown = (e) => {
    if (minimized) return;
    setDragging(true);
    const rect = widgetRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [dragging, dragOffset]);

  const handleMinimize = () => {
    setMinimized(true);
  };

  const handleMaximize = () => {
    setMinimized(false);
  };

  // Minimized state - show TEXT CHAT button
  if (minimized) {
    return (
      <Button
        onClick={handleMaximize}
        className="fixed z-[9999] bg-primary text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
        style={{ left: position.x, top: position.y }}
      >
        <MessageSquare className="w-5 h-5" />
        <span>TEXT CHAT</span>
      </Button>
    );
  }

  // Expanded widget
  return (
    <Card
      ref={widgetRef}
      className="fixed z-[9999] w-96 h-[500px] shadow-2xl border border-slate-200 bg-white rounded-2xl flex flex-col"
      style={{ left: position.x, top: position.y, cursor: dragging ? 'grabbing' : 'default' }}
    >
      {/* Header - Draggable */}
      <div
        className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-2xl cursor-grab"
        onPointerDown={handlePointerDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
            S
          </div>
          <span className="font-semibold">Sree Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMinimize}
            className="text-white hover:bg-white/20"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {/* Greeting message */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
            <p className="text-gray-800 flex items-center gap-2">
              <span className="text-2xl">👋</span>
              <span>Hi! I'm Sree. How can I help you today?</span>
            </p>
          </div>
          
          {/* Additional content would go here */}
        </div>
      </div>

      {/* Footer - Input area */}
      <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
        <input
          type="text"
          placeholder="Type your message..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
    </Card>
  );
}
