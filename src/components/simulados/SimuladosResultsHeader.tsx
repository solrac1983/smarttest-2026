interface Props {
  resultsCount: number;
}

export function SimuladosResultsHeader({ resultsCount }: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
      <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
        {resultsCount} {resultsCount === 1 ? "simulado encontrado" : "simulados encontrados"}
      </p>
    </div>
  );
}
