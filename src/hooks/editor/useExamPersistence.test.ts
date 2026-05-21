import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveEditorContentToDataSources: vi.fn(),
  showInvokeSuccess: vi.fn(),
}));

vi.mock("@/lib/editorServices", () => ({
  saveEditorContentToDataSources: mocks.saveEditorContentToDataSources,
}));

vi.mock("@/lib/invokeFunction", () => ({
  showInvokeSuccess: mocks.showInvokeSuccess,
}));

import { useExamPersistence } from "./useExamPersistence";

describe("useExamPersistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveEditorContentToDataSources.mockResolvedValue(true);
  });

  it("delegates saveToDB to editorServices", async () => {
    const setSavedContent = vi.fn();
    const setDemandStatus = vi.fn();
    const { result } = renderHook(() => useExamPersistence({
      demandId: "d1",
      examId: null,
      content: "abc",
      setContent: vi.fn(),
      setSavedContent,
      hasUnsavedChanges: false,
      isAvulsaExam: false,
      isSimSubject: false,
      simSubjectId: null,
      demandStatus: "in_progress" as any,
      setDemandStatus,
      examConfig: null,
      user: null,
      profile: null,
    }));

    await act(async () => {
      const ok = await result.current.saveToDB("html", { columns: 2 });
      expect(ok).toBe(true);
    });

    expect(mocks.saveEditorContentToDataSources).toHaveBeenCalledWith(expect.objectContaining({
      demandId: "d1",
      content: "html",
      examConfig: { columns: 2 },
    }));
  });
});
