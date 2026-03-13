/**
 * MobileSelect — renders a native bottom-sheet Drawer on mobile (<768px),
 * falls back to the standard shadcn Select on desktop.
 * Drop-in replacement: same props as shadcn Select.
 */
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

function useIsMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

/**
 * options: Array<{ value: string, label: string }>
 * placeholder: string
 * value: string
 * onValueChange: (val: string) => void
 * className: string (applied to trigger)
 */
export default function MobileSelect({
  options = [],
  placeholder = "Select…",
  value,
  onValueChange,
  className,
  disabled,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
          "ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
          className
        )}
      >
        {selectedLabel}
        <svg className="h-4 w-4 opacity-50 ml-2 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)" }}>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onValueChange?.(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  opt.value === value
                    ? "bg-indigo-50 text-indigo-700"
                    : "hover:bg-slate-100 text-slate-800"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}