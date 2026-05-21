import type { ComponentType } from "react";
import type { Simulado, SimuladoSubject } from "@/lib/simuladoTypes";
import { Button } from "@/components/ui/button";
import SimuladoCard from "./SimuladoCard";
import { SimuladosEmptyState } from "./SimuladosEmptyState";

interface Props {
  results: Simulado[];
  viewMode: "grid" | "list";
  expandedId: string | null;
  onToggleExpanded: (id: string) => void;
  isCoordinator: boolean;
  isProfessor: boolean;
  onProfessorEdit: (sub: SimuladoSubject) => void;
  onRevision: (sub: SimuladoSubject) => void;
  onApprove: (subjectId: string) => Promise<void>;
  onApproveAll: (sim: Simulado) => Promise<void>;
  onGenerateFile: (sim: Simulado) => void;
  onGeneratePDF: (sim: Simulado) => void;
  onGenerateAnswerKey: (sim: Simulado) => void;
  onAnnouncement: (sim: Simulado) => void;
  onAnswerSheet: (sim: Simulado) => void;
  onAnswerKeyEditor: (sim: Simulado) => void;
  onEdit: (sim: Simulado) => void;
  onDelete: (sim: Simulado) => Promise<void>;
  simuladosLength: number;
  onCreate: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
  listItem: ComponentType<{ sim: Simulado; isExpanded: boolean; onToggle: () => void }>;
}

export function SimuladosResultsView({
  results,
  viewMode,
  expandedId,
  onToggleExpanded,
  isCoordinator,
  isProfessor,
  onProfessorEdit,
  onRevision,
  onApprove,
  onApproveAll,
  onGenerateFile,
  onGeneratePDF,
  onGenerateAnswerKey,
  onAnnouncement,
  onAnswerSheet,
  onAnswerKeyEditor,
  onEdit,
  onDelete,
  simuladosLength,
  onCreate,
  hasMore,
  onLoadMore,
  listItem: ListItem,
}: Props) {
  if (results.length === 0) {
    return (
      <SimuladosEmptyState
        isProfessor={isProfessor}
        isCoordinator={isCoordinator}
        simuladosLength={simuladosLength}
        onCreate={onCreate}
      />
    );
  }

  return (
    <>
      {viewMode === "list" && (
        <div className="space-y-2 flex-1 mt-4">
          {results.map((sim) => (
            <ListItem
              key={sim.id}
              sim={sim}
              isExpanded={expandedId === sim.id}
              onToggle={() => onToggleExpanded(sim.id)}
            />
          ))}
        </div>
      )}

      {viewMode === "grid" && (
        <div className="space-y-4">
          {results.map((sim) => (
            <SimuladoCard
              key={sim.id}
              sim={sim}
              isExpanded={expandedId === sim.id}
              onToggle={() => onToggleExpanded(sim.id)}
              isCoordinator={isCoordinator}
              isProfessor={isProfessor}
              onProfessorEdit={onProfessorEdit}
              onRevision={onRevision}
              onApprove={onApprove}
              onApproveAll={onApproveAll}
              onGenerateFile={onGenerateFile}
              onGeneratePDF={onGeneratePDF}
              onGenerateAnswerKey={onGenerateAnswerKey}
              onAnnouncement={onAnnouncement}
              onAnswerSheet={onAnswerSheet}
              onAnswerKeyEditor={onAnswerKeyEditor}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={onLoadMore} className="gap-2">
            Carregar mais simulados
          </Button>
        </div>
      )}
    </>
  );
}
