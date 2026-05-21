import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CheckCircle2, Star, Trash2, Users, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { Simulado } from "@/lib/simuladoTypes";
import type { SimuladoResult } from "./correctionsUtils";

interface Props {
  results: SimuladoResult[];
  selectedSim?: Simulado | null;
  onDeleteResult: (id: string) => void;
  onStartLaunch: () => void;
}

export function CorrectionsRankingTable({ results, selectedSim, onDeleteResult, onStartLaunch }: Props) {
  if (results.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center bg-muted/5 border-dashed border-2">
        <div className="p-4 rounded-full bg-muted/20 mb-3">
          <Users className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <h3 className="text-base font-bold text-foreground/70 tracking-tight">Nenhum resultado lançado</h3>
        <p className="text-xs text-muted-foreground max-w-[280px] mt-1 mx-auto">
          Lance as notas dos alunos manualmente ou através de nossa correção inteligente por foto.
        </p>
        <Button variant="outline" size="sm" className="mt-5 gap-2" onClick={onStartLaunch}>
          Começar Lançamento
        </Button>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="pb-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              <span className="font-display font-bold text-foreground/80">Classificação Geral</span>
            </CardTitle>
            <Badge variant="outline" className="font-bold bg-background shadow-none border-border/40">
              {results.length} Alunos Avaliados
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/10 text-muted-foreground text-[10px] uppercase tracking-widest font-bold">
                  <th className="px-4 py-3 text-center w-16"># Pos</th>
                  <th className="px-4 py-3 text-left">Aluno</th>
                  <th className="px-4 py-3 text-center">Nº Chamada</th>
                  <th className="px-4 py-3 text-center">Acertos</th>
                  <th className="px-4 py-3 text-center">Erros</th>
                  <th className="px-4 py-3 text-center">Nota Final</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {results.map((result, index) => (
                  <tr key={result.id} className="group hover:bg-primary/5 transition-colors duration-200">
                    <td className="px-4 py-3.5 text-center font-bold">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}º`}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">{result.student_name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">{selectedSim?.class_groups.join(", ")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center text-muted-foreground font-mono font-medium">{result.student_roll || "—"}</td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold shadow-none">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> {result.correct_count}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-bold shadow-none">
                        <XCircle className="h-3 w-3 mr-1" /> {result.wrong_count}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={cn(
                            "font-bold text-lg font-display",
                            result.score >= 70 ? "text-emerald-600" : result.score >= 50 ? "text-amber-600" : "text-destructive"
                          )}
                        >
                          {result.score}%
                        </span>
                        <Progress value={result.score} className="w-12 h-1" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                              onClick={() => onDeleteResult(result.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir resultado</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
