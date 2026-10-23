import { Capacitor } from "@capacitor/core";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export type ExportResult = "downloaded" | "shared" | "cancelled";
let interruptedCleanup: Promise<void> | null = null;

/** Native exports exist in app cache only while the system share sheet is open. */
export async function exportText(
  name: string,
  value: string,
  type = "text/plain",
): Promise<ExportResult> {
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) throw Error("Invalid export filename.");
  if (isNativeApp()) {
    // A slow startup cleanup must finish before creating a new export.
    if (interruptedCleanup) await interruptedCleanup;
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const token = [...crypto.getRandomValues(new Uint32Array(4))]
      .map((part) => part.toString(16).padStart(8, "0"))
      .join("");
    const path = `bridgeback-export-${token}-${name}`;
    const { uri } = await Filesystem.writeFile({
      path,
      data: value,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({
        title: "BridgeBack preparation",
        files: [uri],
      });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.message === "Share canceled")
        return "cancelled";
      throw error;
    } finally {
      // Do not retain private workspace exports in the app's cache after sharing.
      await Filesystem.deleteFile({ path, directory: Directory.Cache });
    }
  }
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

export async function clearInterruptedExports(): Promise<void> {
  if (!isNativeApp()) return;
  if (interruptedCleanup) return interruptedCleanup;
  interruptedCleanup = cleanInterruptedFiles();
  try {
    await interruptedCleanup;
  } finally {
    interruptedCleanup = null;
  }
}

async function cleanInterruptedFiles(): Promise<void> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { files } = await Filesystem.readdir({
    path: "",
    directory: Directory.Cache,
  });
  await Promise.all(
    files
      .filter((file) => file.name.startsWith("bridgeback-export-"))
      .map((file) =>
        Filesystem.deleteFile({ path: file.name, directory: Directory.Cache }),
      ),
  );
}
