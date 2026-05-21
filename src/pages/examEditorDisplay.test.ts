import { describe, expect, it } from "vitest";
import { resolveAnswerKeySections, resolveAnswerKeyTitle, resolveExamEditorDisplayTitle } from "./examEditorDisplay";

describe("examEditor display resolvers", () => {
  const examTypeLabels = { bimestral: "Bimestral" };

  it("resolves sim subject display title", () => {
    expect(resolveExamEditorDisplayTitle({
      isSimSubject: true,
      simSubjectData: { subject_name: "Matemática", question_count: 10, status: "pending", revision_notes: null, answer_key: null, simulado_title: "Simulado A" },
      isAvulsaExam: false,
      standaloneExam: undefined,
      demand: null,
      simuladoTitle: undefined,
      examTypeLabels,
    })).toBe("Simulado A — Matemática");
  });

  it("resolves demand answer key title", () => {
    expect(resolveAnswerKeyTitle({
      isSimSubject: false,
      simSubjectData: null,
      isAvulsaExam: false,
      standaloneExam: undefined,
      demand: { subjectName: "Matemática", examType: "bimestral" },
      examTypeLabels,
    })).toBe("Matemática - Bimestral");
  });

  it("prefers simulado subject sections when simulado is active", () => {
    const sections = resolveAnswerKeySections({
      isSimulado: true,
      simuladoSubjectSections: [{ name: "Matemática", questionCount: 10 }],
      examSubjectSections: [{ name: "História", questionCount: 5 }],
    });
    expect(sections).toEqual([{ name: "Matemática", questionCount: 10 }]);
  });
});
