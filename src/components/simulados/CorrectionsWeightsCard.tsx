import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Weight } from "lucide-react";
import type { Simulado } from "@/lib/simuladoTypes";

interface Props {
  selectedSim?: Simulado | null;
  useWeights: boolean;
  onUseWeightsChange: (value: boolean) => void;
  subjectWeights: Record<string, number>;
  onSubjectWeightsChange: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export function CorrectionsWeightsCard({
  selectedSim,
  useWeights,
  onUseWeightsChange,
  subjectWeights,
  onSubjectWeightsChange,
}: Props) {
  if (!selectedSim) return null;

  return (
    <Card className="p-4 border-border/60">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Weight className="h-4 w-4 text-primary" />
          <Label className="text-sm font-bold uppercase tracking-wider">Pesos por disciplina</Label>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Ativar pesos</Label>
          <Switch checked={useWeights} onCheckedChange={onUseWeightsChange} />
        </div>
      </div>
      {useWeights && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {selectedSim.subjects.filter((subject) => subject.type !== "discursiva").map((subject) => (
            <div key={subject.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/40">
              <Label className="text-xs flex-1 truncate font-medium" title={subject.subject_name}>{subject.subject_name}</Label>
              <Input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={subjectWeights[subject.subject_name] ?? 1}
                onChange={(e) => onSubjectWeightsChange((prev) => ({
                  ...prev,
                  [subject.subject_name]: parseFloat(e.target.value) || 0,
                }))}
                className="h-7 w-14 text-xs text-center font-bold bg-background"
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
