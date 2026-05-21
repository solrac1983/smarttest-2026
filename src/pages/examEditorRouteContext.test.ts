import { describe, expect, it, vi } from "vitest";

vi.mock("@/data/examContentStore", () => ({
  getStandaloneExam: vi.fn((id: string) => (id === "standalone-123" ? { id } : undefined)),
  getExamTitle: vi.fn((id: string) => (id === "simulado-1" ? "Simulado X" : undefined)),
}));

import { resolveExamEditorRouteContext } from "./examEditorRouteContext";

describe("resolveExamEditorRouteContext", () => {
  it("detects blank new editor", () => {
    expect(resolveExamEditorRouteContext(undefined)).toMatchObject({
      demandId: undefined,
      isBlankNew: true,
      isSimulado: false,
      isSimSubject: false,
      simuladoId: null,
      simSubjectId: null,
      isStandaloneInitial: false,
    });
  });

  it("detects simulado subject route", () => {
    expect(resolveExamEditorRouteContext("sim-subject-abc")).toMatchObject({
      isBlankNew: false,
      isSimulado: false,
      isSimSubject: true,
      simuladoId: null,
      simSubjectId: "abc",
    });
  });

  it("detects simulado route", () => {
    expect(resolveExamEditorRouteContext("simulado-42")).toMatchObject({
      isSimulado: true,
      isSimSubject: false,
      simuladoId: "42",
      simSubjectId: null,
    });
  });

  it("detects standalone route from prefix or cache", () => {
    expect(resolveExamEditorRouteContext("standalone-123")).toMatchObject({
      isStandaloneInitial: true,
    });
  });
});
