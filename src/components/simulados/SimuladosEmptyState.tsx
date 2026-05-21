import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  isProfessor: boolean;
  isCoordinator: boolean;
  simuladosLength: number;
  onCreate: () => void;
}

export function SimuladosEmptyState({ isProfessor, isCoordinator, simuladosLength, onCreate }: Props) {
  return (
    <div className="surface-elevated flex flex-col items-center justify-center py-20 text-center border-none shadow-sm animate-in fade-in zoom-in duration-300">
      <div className="h-20 w-20 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
        <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">Nenhum simulado por aqui</h3>
      <p className="text-muted-foreground max-w-xs mx-auto mb-8 font-medium">
        {isProfessor
          ? "Sua fila está vazia no momento. Quando uma disciplina for atribuída ou devolvida para ajustes, ela aparecerá aqui."
          : "Nenhum simulado corresponde aos filtros atuais. Ajuste os critérios ou crie um novo fluxo multidisciplinar."}
      </p>
      {isCoordinator && simuladosLength === 0 && (
        <Button variant="default" className="mt-6 gap-2 font-bold rounded-xl shadow-md px-6 h-11 transition-all hover:scale-105 active:scale-95" onClick={onCreate}>
          <Plus className="h-5 w-5" /> Criar Simulado
        </Button>
      )}
    </div>
  );
}
