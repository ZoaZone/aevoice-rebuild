import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export default function TagInput({ value = [], onChange, placeholder = "Type and press Enter or comma" }) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  const addTag = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  };

  const removeTag = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const tags = text.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    const newTags = tags.filter((t) => !value.includes(t));
    if (newTags.length) {
      onChange([...value, ...newTags]);
    }
    setInputValue("");
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-white min-h-[42px] cursor-text focus-within:ring-1 focus-within:ring-ring"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, i) => (
        <Badge
          key={`${tag}-${i}`}
          variant="secondary"
          className="flex items-center gap-1 text-xs pl-2 pr-1 py-0.5"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(i);
            }}
            className="ml-0.5 rounded-full hover:bg-slate-300 p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          if (inputValue.trim()) {
            addTag(inputValue);
            setInputValue("");
          }
        }}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] border-0 shadow-none p-0 h-6 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}