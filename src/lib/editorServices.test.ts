import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  order: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  getStandaloneExam: vi.fn(),
  saveStandaloneExamToDB: vi.fn(),
  saveExamContent: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

vi.mock("@/data/examContentStore", () => ({
  getStandaloneExam: mocks.getStandaloneExam,
  saveStandaloneExamToDB: mocks.saveStandaloneExamToDB,
  saveExamContent: mocks.saveExamContent,
}));

import {
  fetchDemandEditorRecord,
  fetchHeaderTemplateRecords,
  fetchStandaloneExamContent,
  saveEditorContentToDataSources,
} from "./editorServices";

describe("editorServices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    mocks.from.mockReturnValue({
      select: mocks.select,
      update: mocks.update,
    });
    mocks.select.mockReturnValue({
      eq: mocks.eq,
      order: mocks.order,
      maybeSingle: mocks.maybeSingle,
    });
    mocks.order.mockReturnValue({ data: [], error: null });
    mocks.eq.mockReturnValue({
      maybeSingle: mocks.maybeSingle,
      order: mocks.order,
      eq: mocks.eq,
    });
    mocks.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
  });

  it("fetches standalone exam content safely", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { content: "abc" } });
    const content = await fetchStandaloneExamContent("id-1");
    expect(content).toBe("abc");
  });

  it("fetches demand editor record and maps fields", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "d1",
        name: "Demanda",
        status: "submitted",
        exam_type: "bimestral",
        deadline: null,
        class_groups: ["A"],
        notes: "obs",
        content: "html",
        print_settings: { orientation: "portrait" },
        subjects: { name: "Matemática" },
        teachers: { name: "Professor 1" },
      },
    });

    const record = await fetchDemandEditorRecord("d1");
    expect(record).toMatchObject({
      id: "d1",
      subjectName: "Matemática",
      teacherName: "Professor 1",
      content: "html",
    });
  });

  it("fetches header template records ordered", async () => {
    mocks.order.mockResolvedValueOnce({ data: [{ id: "h1", name: "Header", file_url: "url", segment: null, grade: null }] });
    const data = await fetchHeaderTemplateRecords();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("h1");
  });

  it("saves sim subject content via supabase", async () => {
    const ok = await saveEditorContentToDataSources({
      demandId: "sim-subject-x",
      examId: null,
      content: "html",
      examConfig: null,
      isAvulsaExam: false,
      isSimSubject: true,
      simSubjectId: "sub-1",
      demandStatus: "submitted",
      user: null,
      profile: null,
    });

    expect(ok).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("save_simulado_subject_progress", {
      _subject_id: "sub-1",
      _content: "html",
      _answer_key: null,
    });
  });

  it("saves standalone exam content through store/db bridge", async () => {
    mocks.getStandaloneExam.mockReturnValue({ id: "standalone-1", title: "A", content: "old", status: "in_progress" });

    const ok = await saveEditorContentToDataSources({
      demandId: "standalone-1",
      examId: null,
      content: "new-html",
      examConfig: { columns: 2 },
      isAvulsaExam: true,
      isSimSubject: false,
      simSubjectId: null,
      demandStatus: "in_progress",
      user: { id: "u1" },
      profile: { company_id: "c1" },
    });

    expect(ok).toBe(true);
    expect(mocks.saveExamContent).toHaveBeenCalledWith("standalone-1", "new-html");
    expect(mocks.saveStandaloneExamToDB).toHaveBeenCalled();
  });
});
