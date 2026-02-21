import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  id?: string;
  required?: boolean;
  className?: string;
}

const AutocompleteInput = ({ value, onChange, suggestions, placeholder, id, required, className }: AutocompleteInputProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!value.trim()) return [];
    return suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value).slice(0, 6);
  }, [suggestions, value]);

  return (
    <div className="relative" ref={ref}>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => value.trim() && setOpen(true)}
        placeholder={placeholder}
        required={required}
        className={cn("h-11 rounded-xl", className)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-[100] top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
            >
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
