import { ArrowDown, ArrowUp, ArrowUpDown, LayoutGrid, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface StatusFilterOption {
  label: string;
  value: string;
}

interface SortOption {
  label: string;
  value: string;
}

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  sortField: string;
  onSortFieldChange: (value: string) => void;
  sortDir: "asc" | "desc";
  onSortDirToggle: () => void;
  viewMode: "grid" | "list";
  onViewModeChange: (value: "grid" | "list") => void;
  statusFilters: StatusFilterOption[];
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortOptions: SortOption[];
  statusCounts: Record<string, number>;
}

export function SimuladosToolbar({
  search,
  onSearchChange,
  sortField,
  onSortFieldChange,
  sortDir,
  onSortDirToggle,
  viewMode,
  onViewModeChange,
  statusFilters,
  statusFilter,
  onStatusFilterChange,
  sortOptions,
  statusCounts,
}: Props) {
  return (
    <div className="surface-elevated rounded-[2rem] p-5 md:p-6 space-y-5 border-none shadow-md">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(280px,1.4fr)_auto] gap-3 flex-1 items-center">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar título, disciplina..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-11 bg-secondary/50 border-none focus-visible:ring-primary/20 rounded-xl font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={sortField} onValueChange={onSortFieldChange}>
              <SelectTrigger className="w-full md:w-[150px] h-11 bg-secondary/50 border-none rounded-xl font-medium">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Ordenar" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="rounded-lg">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="secondary"
              size="icon"
              className="h-11 w-11 rounded-xl bg-secondary/50 hover:bg-secondary/80"
              onClick={onSortDirToggle}
              title={sortDir === "asc" ? "Crescente" : "Decrescente"}
            >
              {sortDir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end">
          <span className="text-xs font-bold text-muted-foreground uppercase mr-2">Visualização</span>
          <div className="flex p-1 bg-secondary/50 rounded-xl">
            <button
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === "grid"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === "list"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-2">Filtrar Status</span>
        {statusFilters.map((status) => (
          <button
            key={status.value}
            onClick={() => onStatusFilterChange(status.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
              statusFilter === status.value
                ? "bg-primary border-primary text-white shadow-md shadow-primary/20 scale-105"
                : "bg-transparent border-transparent text-muted-foreground hover:bg-secondary/80"
            )}
          >
            {status.label}
            {status.value !== "all" && (
              <span
                className={cn(
                  "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
                  statusFilter === status.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {statusCounts[status.value] || 0}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
