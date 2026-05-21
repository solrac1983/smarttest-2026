import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/invokeFunction";
import { useAuth } from "@/hooks/useAuth";
import { Simulado } from "@/lib/simuladoTypes";
import { getSimuladoCorrectionBlockReason, isSimuladoReadyForCorrection } from "@/lib/simuladoWorkflow";
import {
  buildCorrectionPreview,
  buildCorrectionStats,
  buildQuestionSubjects,
  buildSubjectAverages,
  parseAnswerKey,
  type CorrectionPreview,
  type SimuladoResult,
} from "./correctionsUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Trophy
} from "lucide-react";
import BatchCorrectionDialog from "./BatchCorrectionDialog";
import { CorrectionsSummaryCards } from "./CorrectionsSummaryCards";
import { CorrectionsRankingTable } from "./CorrectionsRankingTable";
import { CorrectionsToolbar } from "./CorrectionsToolbar";
import { ManualCorrectionDialog } from "./ManualCorrectionDialog";
import { CorrectionsWeightsCard } from "./CorrectionsWeightsCard";
import { CorrectionsSubjectAverages } from "./CorrectionsSubjectAverages";

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class_group: string;
}


interface Props {
  simulados: Simulado[];
}

export default function CorrectionsTab({ simulados }: Props) {
  const { profile, role } = useAuth();
  const [selectedSimId, setSelectedSimId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<SimuladoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [manualAnswers, setManualAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiCorrectionPreview, setAiCorrectionPreview] = useState<CorrectionPreview | null>(null);
  const [useWeights, setUseWeights] = useState(false);
  const [subjectWeights, setSubjectWeights] = useState<Record<string, number>>({});

  const selectedSim = simulados.find(s => s.id === selectedSimId);
  const answerKey = selectedSim ? parseAnswerKey(selectedSim.subjects) : {};
  const totalQ = selectedSim
    ? selectedSim.subjects.filter(s => s.type !== "discursiva").reduce((sum, s) => sum + s.question_count, 0)
    : 0;
  const canManageCorrections = role === "admin" || role === "coordinator" || role === "super_admin";
  const correctionAccessReason = canManageCorrections
    ? null
    : "Somente coordenação e administração podem lançar correções de simulados.";
  const eligibleSimulados = useMemo(
    () => simulados.filter((sim) => isSimuladoReadyForCorrection(sim.subjects)),
    [simulados]
  );
  const correctionBlockReason = selectedSim ? getSimuladoCorrectionBlockReason(selectedSim.subjects) : null;
  const correctionDisabledReason = correctionAccessReason || correctionBlockReason;
  const correctionEnabled = Boolean(selectedSim) && !correctionDisabledReason;

  // Initialize weights when simulado changes
  useEffect(() => {
    if (selectedSim) {
      const weights: Record<string, number> = {};
      selectedSim.subjects.filter(s => s.type !== "discursiva").forEach(s => {
        weights[s.subject_name] = subjectWeights[s.subject_name] ?? 1;
      });
      setSubjectWeights(weights);
    }
  }, [selectedSimId]);

  const fetchStudents = useCallback(async () => {
    if (!profile?.company_id) return;
    const { data } = await (supabase as any)
      .from("students")
      .select("id, name, roll_number, class_group")
      .eq("company_id", profile.company_id)
      .order("name");
    setStudents(data || []);
  }, [profile?.company_id]);

  const fetchResults = useCallback(async () => {
    if (!selectedSimId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("simulado_results")
      .select("*")
      .eq("simulado_id", selectedSimId)
      .order("score", { ascending: false });

    const enriched: SimuladoResult[] = (data || []).map((r: any) => {
      const student = students.find(s => s.id === r.student_id);
      return {
        ...r,
        answers: r.answers || {},
        student_name: student?.name || "Aluno desconhecido",
        student_roll: student?.roll_number || "",
      };
    });
    setResults(enriched);
    setLoading(false);
  }, [selectedSimId, students]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => { if (selectedSimId && students.length > 0) fetchResults(); }, [selectedSimId, students, fetchResults]);

  const openAddResult = () => {
    if (correctionDisabledReason) {
      toast({ title: correctionDisabledReason, variant: "destructive" });
      return;
    }

    setSelectedStudentId("");
    setManualAnswers({});
    setAiCorrectionPreview(null);
    setAddDialogOpen(true);
  };

  const gradeAndSave = async () => {
    if (correctionDisabledReason) {
      toast({ title: correctionDisabledReason, variant: "destructive" });
      return;
    }

    if (!selectedStudentId || !selectedSimId) {
      toast({ title: "Selecione um aluno.", variant: "destructive" });
      return;
    }

    let correct = 0;
    let wrong = 0;
    let weightedCorrect = 0;
    let weightedTotal = 0;

    if (selectedSim && useWeights) {
      let qNum = 1;
      for (const s of selectedSim.subjects) {
        if (s.type === "discursiva") continue;
        const w = subjectWeights[s.subject_name] ?? 1;
        for (let i = 0; i < s.question_count; i++) {
          const studentAnswer = manualAnswers[String(qNum)]?.toUpperCase();
          const correctAnswer = answerKey[qNum];
          if (studentAnswer) {
            if (correctAnswer && studentAnswer === correctAnswer) {
              correct++;
              weightedCorrect += w;
            } else {
              wrong++;
            }
          }
          weightedTotal += w;
          qNum++;
        }
      }
    } else {
      for (let q = 1; q <= totalQ; q++) {
        const studentAnswer = manualAnswers[String(q)]?.toUpperCase();
        const correctAnswer = answerKey[q];
        if (!studentAnswer) continue;
        if (correctAnswer && studentAnswer === correctAnswer) {
          correct++;
        } else {
          wrong++;
        }
      }
    }

    const score = useWeights && weightedTotal > 0
      ? Math.round((weightedCorrect / weightedTotal) * 1000) / 10
      : totalQ > 0 ? Math.round((correct / totalQ) * 1000) / 10 : 0;

    setSaving(true);
    const { data: resultData, error } = await supabase.rpc("save_simulado_correction_result", {
      _simulado_id: selectedSimId,
      _student_id: selectedStudentId,
      _answers: manualAnswers,
      _score: score,
      _correct_count: correct,
      _wrong_count: wrong,
      _total_questions: totalQ,
    });

    if (error) {
      toast({ title: "Erro ao salvar resultado.", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Resultado salvo! Nota: ${score}%` });
      setAddDialogOpen(false);
      fetchResults();
    }
    setSaving(false);
  };

  const deleteResult = async (id: string) => {
    if (!canManageCorrections) {
      toast({ title: "Somente coordenação e administração podem remover resultados.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.rpc("delete_simulado_correction_result", {
      _result_id: id,
    });

    if (error) {
      toast({ title: "Erro ao remover resultado.", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Resultado removido." });
    fetchResults();
  };

  const downloadRanking = () => {
    if (results.length === 0) return;
    
    const headers = ["Posição", "Aluno", "Nº Chamada", "Acertos", "Erros", "Nota %"];
    const rows = results.map((r, i) => [
      `${i + 1}º`,
      r.student_name,
      r.student_roll || "",
      r.correct_count,
      r.wrong_count,
      `${r.score}%`
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ranking_${selectedSim?.title || "simulado"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AI photo reading
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (correctionDisabledReason) {
      toast({ title: correctionDisabledReason, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Selecione uma imagem.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Imagem muito grande (máx 10MB).", variant: "destructive" });
      return;
    }

    setAiProcessing(true);
    setAiProgress(20);

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      setAiProgress(40);

      const { data, error } = await invokeFunction<{ answers?: Record<string, string>; roll_number?: string; error?: string }>("read-answer-sheet", {
        body: {
          image_base64: base64,
          total_questions: totalQ,
          alternatives_count: 5,
        },
        silent: true,
      });

      setAiProgress(80);

      if (error) {
        throw new Error(error.message);
      }

      if (data?.answers) {
        const answers: Record<string, string> = {};
        const rawAnswers = data.answers || {};
        for (const [k, v] of Object.entries(rawAnswers)) {
          const val = String(v).toUpperCase();
          if (val !== "X") {
            answers[k] = val;
          }
        }
        setManualAnswers(answers);
        
        // Auto-select student by roll_number
        if (data.roll_number && !selectedStudentId) {
          const rollNum = String(data.roll_number).replace(/_+$/, "");
          const matched = students.find(s => s.roll_number === rollNum);
          if (matched) {
            setSelectedStudentId(matched.id);
            toast({ title: `Aluno identificado: ${matched.name} (Nº ${matched.roll_number})` });
          }
        }
        
        const preview = buildCorrectionPreview(answers, answerKey, totalQ);
        setAiCorrectionPreview(preview);

        const filledCount = Object.keys(answers).length;
        toast({
          title: `✅ IA leu ${filledCount} de ${totalQ} respostas!`,
          description: `Pré-correção: ${preview.correct} acertos, ${preview.wrong} erros. Revise antes de salvar.`,
        });
      }

      setAiProgress(100);
    } catch (err: any) {
      console.error("AI read error:", err);
      toast({ 
        title: "Erro na leitura por IA", 
        description: err.message || "Tente novamente com uma foto mais nítida.",
        variant: "destructive" 
      });
    } finally {
      setAiProcessing(false);
      setAiProgress(0);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const questionSubjects = useMemo(() => buildQuestionSubjects(selectedSim), [selectedSim]);

  const {
    avgScore,
    maxScore,
    minScore,
    participationRate,
  } = useMemo(() => buildCorrectionStats(results, students.length), [results, students.length]);

  const subjectAverages = useMemo(
    () => buildSubjectAverages(selectedSim, results, answerKey),
    [selectedSim, results, answerKey]
  );

  return (
    <div className="space-y-6">
      <CorrectionsToolbar
        simulados={simulados}
        selectedSimId={selectedSimId}
        onSelectedSimIdChange={setSelectedSimId}
        eligibleCount={eligibleSimulados.length}
        correctionEnabled={correctionEnabled}
        correctionDisabledReason={correctionDisabledReason}
        resultsCount={results.length}
        onOpenAddResult={openAddResult}
        onOpenBatchDialog={() => setBatchDialogOpen(true)}
        onDownloadRanking={downloadRanking}
      />

      <CorrectionsWeightsCard
        selectedSim={selectedSim}
        useWeights={useWeights}
        onUseWeightsChange={setUseWeights}
        subjectWeights={subjectWeights}
        onSubjectWeightsChange={setSubjectWeights}
      />

      {!selectedSimId && (
        <Card className="flex flex-col items-center justify-center py-20 text-center bg-muted/5 border-dashed border-2">
          <div className="p-5 rounded-full bg-muted/20 mb-4 animate-bounce">
            <Trophy className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-bold text-foreground/80 tracking-tight">Nenhum simulado selecionado</h3>
          <p className="text-sm text-muted-foreground max-w-[320px] mt-1 mx-auto">
            Selecione um simulado acima para visualizar o ranking de alunos, estatísticas de desempenho e lançar novas correções.
          </p>
        </Card>
      )}

      {selectedSimId && !loading && (
        <>
          <CorrectionsSummaryCards
            resultsCount={results.length}
            studentsCount={students.length}
            participationRate={participationRate}
            avgScore={avgScore}
            maxScore={maxScore}
            minScore={minScore}
          />

          <CorrectionsSubjectAverages subjectAverages={subjectAverages} />

          <CorrectionsRankingTable
            results={results}
            selectedSim={selectedSim}
            onDeleteResult={deleteResult}
            onStartLaunch={openAddResult}
          />
        </>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Carregando dados...</p>
        </div>
      )}

      <ManualCorrectionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        students={students}
        selectedStudentId={selectedStudentId}
        onSelectedStudentIdChange={setSelectedStudentId}
        aiProcessing={aiProcessing}
        aiProgress={aiProgress}
        onOpenCamera={() => fileInputRef.current?.click()}
        onOpenFile={() => {
          if (fileInputRef.current) {
            fileInputRef.current.removeAttribute("capture");
            fileInputRef.current.click();
            setTimeout(() => fileInputRef.current?.setAttribute("capture", "environment"), 100);
          }
        }}
        fileInputRef={fileInputRef}
        onPhotoUpload={handlePhotoUpload}
        aiCorrectionPreview={aiCorrectionPreview}
        answerKey={answerKey}
        totalQ={totalQ}
        questionSubjects={questionSubjects}
        manualAnswers={manualAnswers}
        onManualAnswersChange={setManualAnswers}
        saving={saving}
        onSave={gradeAndSave}
      />

      {/* Batch correction dialog */}
      <BatchCorrectionDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        simuladoId={selectedSimId}
        simuladoTitle={selectedSim?.title}
        totalQuestions={totalQ}
        answerKey={answerKey}
        students={students}
        isEligible={correctionEnabled}
        blockReason={correctionDisabledReason}
        onSaved={fetchResults}
      />
    </div>
  );
}
