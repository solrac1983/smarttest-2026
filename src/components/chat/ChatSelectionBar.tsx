import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Forward, X } from "lucide-react";

interface Props {
  visible: boolean;
  totalSelectable: number;
  selectedCount: number;
  allSelected: boolean;
  onToggleAll: (checked: boolean) => void;
  onForward: () => void;
  onCancel: () => void;
}

export function ChatSelectionBar({
  visible,
  totalSelectable,
  selectedCount,
  allSelected,
  onToggleAll,
  onForward,
  onCancel,
}: Props) {
  if (!visible) return null;

  return (
    <div className="px-4 py-3 border-b border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-card/90 px-3 py-2 shadow-sm">
        <Checkbox checked={allSelected} onCheckedChange={(checked) => onToggleAll(!!checked)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {selectedCount > 0 ? `${selectedCount} mensagem(ns) selecionada(s)` : "Selecione as mensagens para agir em lote"}
          </p>
          <p className="text-xs text-muted-foreground">{totalSelectable} mensagem(ns) disponíveis para seleção</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" className="gap-2 rounded-xl" disabled={selectedCount === 0} onClick={onForward}>
            <Forward className="h-4 w-4" /> Encaminhar
          </Button>
          <Button size="sm" variant="ghost" className="rounded-xl" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
