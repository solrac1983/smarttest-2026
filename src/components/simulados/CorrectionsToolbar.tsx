import { AlertCircle, Download, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Simulado } from "@/lib/simuladoTypes";
import { getSimuladoCorrectionBlockReason } from "@/lib/simuladoWorkflow";

interface Props {
  simulados: Simulado[];
  selectedSimId: string;
  onSelectedSimIdChange: (value: string) => void;
  eligibleCount: number;
  correctionEnabled: boolean;
  correctionDisabledReason: string | null;
  resultsCount: number;
  onOpenAddResult: () => void;
  onOpenBatchDialog: () => void;
  onDownloadRanking: () => void;
}

export function CorrectionsToolbar({
  simulados,
  selectedSimId,
  onSelectedSimIdChange,
  eligibleCount,
  correctionEnabled,
  correctionDisabledReason,
  resultsCount,
  onOpenAddResult,
  onOpenBatchDialog,
  onDownloadRanking,
}: Props) {
  return (
    <>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="space-y-1 min-w-[300px]">
          <Label className="text-xs text-muted-foreground">Selecione o simulado</Label>
          <Select value={selectedSimId} onValueChange={onSelectedSimIdChange}>
            <SelectTrigger><SelectValue placeholder="Escolha um simulado" /></SelectTrigger>
            <SelectContent>
              {simulados.map((simulado) => {
                const disabledReason = getSimuladoCorrectionBlockReason(simulado.subjects);
                const isEligible = !disabledReason;

                return (
                  <SelectItem key={simulado.id} value={simulado.id}>
                    {simulado.title}{!isEligible ? " — bloqueado" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {eligibleCount} de {simulados.length} simulados aptos para correção no momento.
          </p>
        </div>
        {selectedSimId && (
          <div className="flex gap-2 mt-5">
            <Button onClick={onOpenAddResult} disabled={!correctionEnabled} className="gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:hover:scale-100">
              <UserPlus className="h-4 w-4" /> Lançar Resultado
            </Button>
            <Button onClick={onOpenBatchDialog} disabled={!correctionEnabled} variant="outline" className="gap-2 hover:bg-muted/60 transition-colors">
              <Users className="h-4 w-4" /> Correção em Lote
            </Button>
            {resultsCount > 0 && (
              <Button onClick={onDownloadRanking} variant="ghost" className="gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Download className="h-4 w-4" /> Exportar Ranking
              </Button>
            )}
          </div>
        )}
      </div>

      {selectedSimId && correctionDisabledReason && (
        <Card className="border-amber-300/60 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-800/50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Correção bloqueada</p>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80">{correctionDisabledReason}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
