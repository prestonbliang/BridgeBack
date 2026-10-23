// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  native: vi.fn(() => true),
  write: vi.fn(),
  remove: vi.fn(),
  read: vi.fn(),
  share: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: mocks.native },
}));
vi.mock("@capacitor/filesystem", () => ({
  Filesystem: {
    writeFile: mocks.write,
    deleteFile: mocks.remove,
    readdir: mocks.read,
  },
  Directory: { Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
}));
vi.mock("@capacitor/share", () => ({ Share: { share: mocks.share } }));
import { clearInterruptedExports, exportText } from "../lib/platform";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.native.mockReturnValue(true);
  mocks.write.mockResolvedValue({ uri: "file:///cache/preparation.txt" });
  mocks.remove.mockResolvedValue(undefined);
  mocks.share.mockResolvedValue({
    activityType: "com.apple.UIKit.activity.SaveToFiles",
  });
});
it("shares a private file through the native sheet and removes its temporary copy", async () => {
  expect(
    await exportText("progress.json", '{"household":2}', "application/json"),
  ).toBe("shared");
  expect(mocks.write).toHaveBeenCalledWith(
    expect.objectContaining({
      directory: "CACHE",
      encoding: "utf8",
      data: '{"household":2}',
    }),
  );
  expect(mocks.share).toHaveBeenCalledWith(
    expect.objectContaining({ files: ["file:///cache/preparation.txt"] }),
  );
  expect(mocks.remove).toHaveBeenCalledWith(
    expect.objectContaining({
      directory: "CACHE",
      path: expect.stringMatching(/^bridgeback-export-.*-progress.json$/),
    }),
  );
});
it("treats dismissal as cancellation, cleans the file, and preserves actual failures", async () => {
  mocks.share.mockRejectedValueOnce(new Error("Share canceled"));
  expect(await exportText("questions.txt", "Questions")).toBe("cancelled");
  expect(mocks.remove).toHaveBeenCalledTimes(1);
  mocks.share.mockRejectedValueOnce(new Error("Native share failed"));
  await expect(exportText("questions.txt", "Questions")).rejects.toThrow(
    "Native share failed",
  );
  expect(mocks.remove).toHaveBeenCalledTimes(2);
});
it("rejects unsafe names and file-write errors before sharing", async () => {
  await expect(exportText("../private.json", "data")).rejects.toThrow(
    "filename",
  );
  expect(mocks.write).not.toHaveBeenCalled();
  mocks.write.mockRejectedValueOnce(new Error("Storage full"));
  await expect(exportText("progress.json", "data")).rejects.toThrow(
    "Storage full",
  );
  expect(mocks.share).not.toHaveBeenCalled();
});
it("cleans only interrupted BridgeBack exports at next app start", async () => {
  mocks.read.mockResolvedValue({
    files: [
      { name: "bridgeback-export-interrupted-progress.json" },
      { name: "other-cache.dat" },
    ],
  });
  await clearInterruptedExports();
  expect(mocks.remove.mock.calls).toEqual([
    [
      {
        path: "bridgeback-export-interrupted-progress.json",
        directory: "CACHE",
      },
    ],
  ]);
  mocks.native.mockReturnValue(false);
  await clearInterruptedExports();
  expect(mocks.read).toHaveBeenCalledTimes(1);
});

it("waits for a slow startup cleanup before writing a new export", async () => {
  let finishRead!: (value: { files: { name: string }[] }) => void;
  mocks.read.mockReturnValueOnce(
    new Promise((resolve) => {
      finishRead = resolve;
    }),
  );
  const cleaning = clearInterruptedExports();
  const exporting = exportText("progress.json", "{}");
  await vi.waitFor(() => expect(mocks.read).toHaveBeenCalled());
  expect(mocks.write).not.toHaveBeenCalled();
  finishRead({ files: [{ name: "bridgeback-export-old-progress.json" }] });
  await cleaning;
  expect(await exporting).toBe("shared");
  expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.write.mock.invocationCallOrder[0],
  );
});

it("does not silently ignore a failed temporary-file cleanup", async () => {
  mocks.remove.mockRejectedValueOnce(new Error("Cache cleanup failed"));
  await expect(exportText("questions.txt", "Questions")).rejects.toThrow(
    "Cache cleanup failed",
  );
});
