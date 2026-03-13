import { useEffect, useRef, useState } from "react";

export function useDraggable({ width = 360, height = 480, storageKey = "dragPosition" } = {}) {
  const ref = useRef(null);
  const dragging = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState(() => {
    if (typeof window === "undefined") return { x: 16, y: 16 };
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    const x = Math.max(16, (window.innerWidth || 0) - (width + 24));
    const y = Math.max(16, (window.innerHeight || 0) - (height + 24));
    return { x, y };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(storageKey, JSON.stringify(pos)); } catch (_) {}
  }, [pos, storageKey]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.left = pos.x + "px";
    ref.current.style.top = pos.y + "px";
  }, [pos]);

  const onPointerDown = (e) => {
    dragging.current = true;
    startRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    const onMove = (ev) => {
      if (!dragging.current) return;
      const nx = Math.max(0, Math.min(ev.clientX - startRef.current.x, (window.innerWidth || 0) - width));
      const ny = Math.max(0, Math.min(ev.clientY - startRef.current.y, (window.innerHeight || 0) - height));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (ref.current) ref.current.style.cursor = "grab";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    if (ref.current) ref.current.style.cursor = "grabbing";
  };

  return { ref, position: pos, setPosition: setPos, onPointerDown };
}