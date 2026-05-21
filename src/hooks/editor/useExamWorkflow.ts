import { useNavigate } from "react-router-dom";
import { saveExamContent } from "@/data/examContentStore";
import { approveEditorDemand, rejectEditorDemand, submitEditorDemand } from "@/lib/editorServices";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";
import { toast } from "sonner";
import { DemandStatus } from "@/types";

interface UseExamWorkflowOptions {
  demandId?: string;
  examId: string | null;
  content: string;
  examConfig: any;
  user: any;
  profile: any;
  setDemandStatus: (status: DemandStatus) => void;
  setSavedContent: (content: string) => void;
  setSubmitDialogOpen: (open: boolean) => void;
  setApproveDialogOpen: (open: boolean) => void;
  setRejectDialogOpen: (open: boolean) => void;
  setRevisionNote: (note: string) => void;
}

export function useExamWorkflow({
  demandId,
  examId,
  content,
  examConfig,
  user,
  profile,
  setDemandStatus,
  setSavedContent,
  setSubmitDialogOpen,
  setApproveDialogOpen,
  setRejectDialogOpen,
  setRevisionNote,
}: UseExamWorkflowOptions) {
  const navigate = useNavigate();

  const handleSubmitForReview = async (isSimSubject: boolean, simSubjectId: string | null) => {
    if (demandId) saveExamContent(demandId, content);
    await submitEditorDemand({ demandId, isSimSubject, simSubjectId, content });
    setDemandStatus("submitted");
    setSavedContent(content);
    setSubmitDialogOpen(false);
    showInvokeSuccess("Prova enviada para revisão da coordenação!");
  };

  const handleApprove = async (isAvulsaExam: boolean, isSimSubject = false, simSubjectId: string | null = null) => {
    await approveEditorDemand({ demandId, examId, isAvulsaExam, content, examConfig, user, profile, isSimSubject, simSubjectId });
    setDemandStatus("approved");
    setApproveDialogOpen(false);
    showInvokeSuccess("Prova aprovada com sucesso!");
    if (!isAvulsaExam) navigate("/aprovacoes");
  };

  const handleReject = async (rejectionNote: string, isAvulsaExam: boolean, isSimSubject = false, simSubjectId: string | null = null) => {
    if (!rejectionNote.trim()) {
      showInvokeError("Informe o motivo da rejeição.");
      return;
    }
    if (isSimSubject && simSubjectId) {
      await rejectEditorDemand(demandId || simSubjectId, rejectionNote, { isSimSubject, simSubjectId });
    } else if (demandId && !isAvulsaExam && !demandId.startsWith("simulado-")) {
      await rejectEditorDemand(demandId, rejectionNote);
    }
    setDemandStatus("revision_requested");
    setRevisionNote(rejectionNote);
    setRejectDialogOpen(false);
    toast.info("Prova devolvida ao professor com observações.");
  };

  return { handleSubmitForReview, handleApprove, handleReject };
}
