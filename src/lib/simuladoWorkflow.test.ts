import { describe, expect, it } from "vitest";
import {
  canApproveAllSimuladoSubjects,
  createEmptySimuladoStatusCounts,
  deriveSimuladoWorkflowStatus,
  getPendingApprovalSubjects,
  getSimuladoCorrectionBlockReason,
  getSimuladoStatusCounts,
  getSubjectsMissingAnswerKey,
  hasSubjectAnswerKey,
  isSimuladoReadyForCorrection,
  mapLegacyStatusToWorkflowStatus,
  mapWorkflowStatusToLegacyStatus,
} from "./simuladoWorkflow";

const makeSubject = (overrides: Partial<{ status: "pending" | "in_progress" | "submitted" | "approved" | "revision_requested"; teacher_id: string | null; type: "objetiva" | "discursiva"; answer_key: string; subject_name: string }> = {}) => ({
  status: "pending" as const,
  teacher_id: "teacher-1",
  type: "objetiva" as const,
  answer_key: "1-A",
  subject_name: "Matemática",
  ...overrides,
});

describe("simuladoWorkflow", () => {
  it("creates empty status counts", () => {
    expect(createEmptySimuladoStatusCounts()).toEqual({
      pending: 0,
      in_progress: 0,
      submitted: 0,
      approved: 0,
      revision_requested: 0,
    });
  });

  it("counts subject statuses", () => {
    expect(
      getSimuladoStatusCounts([
        makeSubject({ status: "pending" }),
        makeSubject({ status: "submitted" }),
        makeSubject({ status: "approved" }),
      ])
    ).toEqual({
      pending: 1,
      in_progress: 0,
      submitted: 1,
      approved: 1,
      revision_requested: 0,
    });
  });

  it("derives draft for empty or unassigned simulados", () => {
    expect(deriveSimuladoWorkflowStatus([])).toBe("draft");
    expect(deriveSimuladoWorkflowStatus([makeSubject({ teacher_id: null })])).toBe("draft");
  });

  it("derives pending when all assigned subjects are pending", () => {
    expect(deriveSimuladoWorkflowStatus([makeSubject(), makeSubject()])).toBe("pending");
  });

  it("derives in_progress when a teacher started elaboration", () => {
    expect(deriveSimuladoWorkflowStatus([makeSubject({ status: "in_progress" }), makeSubject()])).toBe("in_progress");
  });

  it("derives submitted when awaiting review", () => {
    expect(deriveSimuladoWorkflowStatus([makeSubject({ status: "submitted" }), makeSubject({ status: "approved" })])).toBe("submitted");
  });

  it("derives revision_requested with highest priority below approval", () => {
    expect(deriveSimuladoWorkflowStatus([makeSubject({ status: "revision_requested" }), makeSubject({ status: "submitted" })])).toBe("revision_requested");
  });

  it("derives approved when all subjects are approved", () => {
    expect(deriveSimuladoWorkflowStatus([makeSubject({ status: "approved" }), makeSubject({ status: "approved" })])).toBe("approved");
  });

  it("maps workflow and legacy statuses consistently", () => {
    expect(mapWorkflowStatusToLegacyStatus("draft")).toBe("draft");
    expect(mapWorkflowStatusToLegacyStatus("pending")).toBe("sent");
    expect(mapWorkflowStatusToLegacyStatus("submitted")).toBe("sent");
    expect(mapWorkflowStatusToLegacyStatus("in_progress")).toBe("in_progress");
    expect(mapWorkflowStatusToLegacyStatus("revision_requested")).toBe("in_progress");
    expect(mapWorkflowStatusToLegacyStatus("approved")).toBe("complete");

    expect(mapLegacyStatusToWorkflowStatus("draft")).toBe("draft");
    expect(mapLegacyStatusToWorkflowStatus("sent")).toBe("pending");
    expect(mapLegacyStatusToWorkflowStatus("in_progress")).toBe("in_progress");
    expect(mapLegacyStatusToWorkflowStatus("complete")).toBe("approved");
  });

  it("allows bulk approval only for submitted or approved subjects", () => {
    expect(canApproveAllSimuladoSubjects([makeSubject({ status: "submitted" }), makeSubject({ status: "approved" })])).toBe(true);
    expect(canApproveAllSimuladoSubjects([makeSubject({ status: "in_progress" })])).toBe(false);
    expect(canApproveAllSimuladoSubjects([])).toBe(false);
  });

  it("returns only submitted subjects pending approval", () => {
    const submitted = makeSubject({ status: "submitted" });
    expect(
      getPendingApprovalSubjects([
        submitted,
        makeSubject({ status: "approved" }),
        makeSubject({ status: "revision_requested" }),
      ])
    ).toEqual([submitted]);
  });

  it("recognizes answer key requirements only for objective subjects", () => {
    expect(hasSubjectAnswerKey(makeSubject({ answer_key: "1-A, 2-B" }))).toBe(true);
    expect(hasSubjectAnswerKey(makeSubject({ answer_key: "" }))).toBe(false);
    expect(hasSubjectAnswerKey(makeSubject({ type: "discursiva", answer_key: "" }))).toBe(true);
  });

  it("returns only objective subjects missing answer keys", () => {
    const missing = makeSubject({ answer_key: "", subject_name: "Física" });
    expect(
      getSubjectsMissingAnswerKey([
        makeSubject({ subject_name: "Matemática" }),
        missing,
        makeSubject({ type: "discursiva", answer_key: "", subject_name: "Redação" }),
      ])
    ).toEqual([missing]);
  });

  it("allows correction only when all subjects are approved and objective answer keys are complete", () => {
    expect(
      isSimuladoReadyForCorrection([
        makeSubject({ status: "approved", answer_key: "1-A", subject_name: "Matemática" }),
        makeSubject({ status: "approved", answer_key: "", type: "discursiva", subject_name: "Redação" }),
      ])
    ).toBe(true);

    expect(
      isSimuladoReadyForCorrection([
        makeSubject({ status: "approved", answer_key: "1-A" }),
        makeSubject({ status: "submitted", answer_key: "1-A", subject_name: "Física" }),
      ])
    ).toBe(false);

    expect(
      isSimuladoReadyForCorrection([
        makeSubject({ status: "approved", answer_key: "" }),
      ])
    ).toBe(false);
  });

  it("explains why correction is blocked", () => {
    expect(getSimuladoCorrectionBlockReason([])).toMatch(/Adicione disciplinas/);
    expect(getSimuladoCorrectionBlockReason([makeSubject({ teacher_id: null })])).toMatch(/Atribua professores/);
    expect(getSimuladoCorrectionBlockReason([makeSubject({ status: "submitted" })])).toMatch(/finalizados/);
    expect(
      getSimuladoCorrectionBlockReason([
        makeSubject({ status: "approved", answer_key: "" }),
        makeSubject({ status: "approved", answer_key: "1-A", subject_name: "Física" }),
      ])
    ).toMatch(/Matemática/);
  });
});
