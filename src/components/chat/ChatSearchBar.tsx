import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronDown } from "lucide-react";

interface Props {
  open: boolean;
  value: string;
  resultCount: number;
  resultIndex: number;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (value: string) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function ChatSearchBar({
  open,
  value,
  resultCount,
  resultIndex,
  inputRef,
  onChange,
  onClose,
  onPrev,
  onNext,
}: Props) {
  if (!open) return null;

  return (
    <div className="px-4 py-3 border-b border-border/60 bg-gradient-to-r from-muted/40 via-background to-muted/20 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          ref={inputRef}
          placeholder="Buscar mensagens, termos e trechos da conversa..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
        />
        {value && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {resultCount > 0 ? `${resultIndex + 1}/${resultCount}` : "0 resultados"}
            </span>
            {resultCount > 1 && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onPrev}>
                  <ChevronDown className="h-4 w-4 rotate-180" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onNext}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
