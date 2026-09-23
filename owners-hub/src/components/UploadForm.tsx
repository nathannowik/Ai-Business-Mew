"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function UploadForm({ weekId }: { weekId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [dragging, setDragging] = useState(false);

  async function upload() {
    if (!files.length) return;
    setBusy(true);
    setMsg({});
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("caption", caption);
    const res = await fetch(`/api/weeks/${weekId}/files`, { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ error: json.error ?? "Upload failed. Try again." });
    setFiles([]);
    setCaption("");
    if (inputRef.current) inputRef.current.value = "";
    setMsg({ ok: `Uploaded ${json.count} file${json.count === 1 ? "" : "s"}` });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          setFiles(Array.from(e.dataTransfer.files));
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition ${
          dragging ? "border-brand bg-brand-soft" : "border-stone-300 hover:border-brand"
        }`}
      >
        <span className="font-medium text-stone-700">{files.length ? files.map((f) => f.name).join(", ") : "Tap to choose a graphic or file"}</span>
        <span className="mt-1 text-xs text-stone-500">Images, PDFs, docs, design files · no video</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.psd,.ai,.zip,.key,.pages,.heic"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
      </label>
      {files.length > 0 && (
        <>
          <input className="input" placeholder="Caption (optional) — e.g. Instagram post, final" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={upload}>
            {busy ? "Uploading…" : `Upload ${files.length} file${files.length === 1 ? "" : "s"}`}
          </button>
        </>
      )}
      {msg.error && <p className="text-sm text-red-700">{msg.error}</p>}
      {msg.ok && <p className="text-sm text-emerald-700">{msg.ok}</p>}
    </div>
  );
}
