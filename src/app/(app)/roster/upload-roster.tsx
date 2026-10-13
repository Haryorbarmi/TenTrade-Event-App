"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { importRoster, type RosterImportState } from "./actions";

export function UploadRoster({ hasRoster }: { hasRoster: boolean }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RosterImportState>({ status: "idle" });

  function onPick(file: File | undefined) {
    if (!file) return;
    if (hasRoster && !window.confirm("This replaces the whole client roster with the new file. Continue?")) {
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      setResult(await importRoster({ status: "idle" }, formData));
      router.refresh();
    });
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <>
      <input ref={fileInput} type="file" accept=".csv,.xlsx" hidden onChange={(e) => onPick(e.target.files?.[0])} />
      <button
        type="button"
        disabled={pending}
        onClick={() => fileInput.current?.click()}
        className="bg-accent-gradient flex h-[44px] shrink-0 items-center justify-center rounded-[8px] px-[20px] text-[14px] font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Importing…" : hasRoster ? "Replace roster from file" : "Upload client sheet"}
      </button>

      {result.status !== "idle" && (
        <div role="dialog" aria-label="Import result" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[80vh] w-full max-w-[520px] flex-col gap-[16px] overflow-hidden rounded-[12px] bg-white p-6">
            {result.status === "error" ? (
              <p role="alert" className="text-[14px] text-ink">
                {result.message}
              </p>
            ) : (
              <>
                <h2 className="text-[16px] font-semibold text-ink">
                  {result.imported} clients imported{result.skipped.length > 0 ? `, ${result.skipped.length} skipped` : ""}
                </h2>
                {result.skipped.length > 0 && (
                  <ul className="flex min-h-0 flex-col gap-[4px] overflow-y-auto text-[13px] text-muted">
                    {result.skipped.slice(0, 50).map((s) => (
                      <li key={s.line}>
                        Row {s.line}: {s.reason}
                      </li>
                    ))}
                    {result.skipped.length > 50 && <li>…and {result.skipped.length - 50} more.</li>}
                  </ul>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => setResult({ status: "idle" })}
              className="bg-accent-gradient flex h-[44px] items-center justify-center rounded-[8px] text-[14px] font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
