import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveExamContent: vi.fn(),
  submitEditorDemand: vi.fn(),
  approveEditorDemand: vi.fn(),
  rejectEditorDemand: vi.fn(),
  showInvokeSuccess: vi.fn(),
  showInvokeError: vi.fn(),
  toastInfo: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/data/examContentStore", () => ({
  saveExamContent: mocks.saveExamContent,
}));

vi.mock("@/lib/editorServices", () => ({
  submitEditorDemand: mocks.submitEditorDemand,
  approveEditorDemand: mocks.approveEditorDemand,
  rejectEditorDemand: mocks.rejectEditorDemand,
}));

vi.mock("@/lib/invokeFunction", () => ({
  showInvokeSuccess: mocks.showInvokeSuccess,
  showInvokeError: mocks.showInvokeError,
}));

vi.mock("sonner", () => ({
  toast: { info: mocks.toastInfo },
}));

import { useExamWorkflow } from "./useExamWorkflow";

describe("useExamWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.submitEditorDemand.mockResolvedValue(undefined);
    mocks.approveEditorDemand.mockResolvedValue(undefined);
    mocks.rejectEditorDemand.mockResolvedValue(undefined);
  });

  it("submits review using service and updates UI state", async () => {
    const setDemandStatus = vi.fn();
    const setSavedContent = vi.fn();
    const setSubmitDialogOpen = vi.fn();

    const { result } = renderHook(() => useExamWorkflow({
      demandId: "d1",
      examId: null,
      content: "html",
      examConfig: null,
      user: null,
      profile: null,
      setDemandStatus,
      setSavedContent,
      setSubmitDialogOpen,
      setApproveDialogOpen: vi.fn(),
      setRejectDialogOpen: vi.fn(),
      setRevisionNote: vi.fn(),
    }));

    await act(async () => {
      await result.current.handleSubmitForReview(false, null);
    });

    expect(mocks.saveExamContent).toHaveBeenCalledWith("d1", "html");
    expect(mocks.submitEditorDemand).toHaveBeenCalled();
    expect(setDemandStatus).toHaveBeenCalledWith("submitted");
    expect(setSavedContent).toHaveBeenCalledWith("html");
    expect(setSubmitDialogOpen).toHaveBeenCalledWith(false);
  });

  it("validates reject note before calling service", async () => {
    const { result } = renderHook(() => useExamWorkflow({
      demandId: "d1",
      examId: null,
      content: "html",
      examConfig: null,
      user: null,
      profile: null,
      setDemandStatus: vi.fn(),
      setSavedContent: vi.fn(),
      setSubmitDialogOpen: vi.fn(),
      setApproveDialogOpen: vi.fn(),
      setRejectDialogOpen: vi.fn(),
      setRevisionNote: vi.fn(),
    }));

    await act(async () => {
      await result.current.handleReject("", false);
    });

    expect(mocks.showInvokeError).toHaveBeenCalled();
    expect(mocks.rejectEditorDemand).not.toHaveBeenCalled();
  });
});
