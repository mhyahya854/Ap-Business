"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { BOOK_MANIFEST, MANIFEST_ENTRIES } from "@/content/book2/manifests";
import { requestPageRangeExport } from "@/content/book2/downloads/range";

export function DownloadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("1");
  const [format, setFormat] = useState<"word" | "pdf">("pdf");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const result = await requestPageRangeExport(
        { from: Number(from), to: Number(to), format },
        MANIFEST_ENTRIES,
        [],
        null,
      );
      if (result.status === "invalid-range") {
        const reason = result.validation.reason;
        setMessage(
          reason === "from-invalid"
            ? "Enter a valid starting page number."
            : reason === "to-invalid"
              ? "Enter a valid ending page number."
              : reason === "order-invalid"
                ? "The first page must come before or equal to the last page."
                : reason === "outside-book"
                  ? "That range extends beyond the verified book page count."
                  : "The verified canonical page count will be available after Word import.",
        );
      } else if (result.status === "not-generated") {
        setMessage("The page export files for this range have not been generated yet.");
      } else if (result.status === "unavailable") {
        setMessage("Range assembly is not available in this release.");
      } else {
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setMessage("The export could not be prepared. Please try again later.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      className="download-dialog"
      ref={dialogRef}
      aria-labelledby="download-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="dialog-heading">
        <div>
          <p className="dialog-eyebrow">Book 2</p>
          <h2 id="download-title">Download pages</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Close download options"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="dialog-intro">
        Choose a canonical reader range. Printed textbook labels are separate.
      </p>
      <form onSubmit={submit}>
        <div className="range-fields">
          <label>
            From page
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setMessage("");
              }}
            />
          </label>
          <label>
            To page
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setMessage("");
              }}
            />
          </label>
        </div>
        <p className="range-hint">
          Planning estimate: about {BOOK_MANIFEST.planningEstimate.toLocaleString()} pages. The
          verified page count is not set yet.
        </p>
        <fieldset className="format-options">
          <legend>Format</legend>
          <label>
            <input
              type="radio"
              name="download-format"
              value="word"
              checked={format === "word"}
              onChange={() => setFormat("word")}
            />{" "}
            Word
          </label>
          <label>
            <input
              type="radio"
              name="download-format"
              value="pdf"
              checked={format === "pdf"}
              onChange={() => setFormat("pdf")}
            />{" "}
            PDF
          </label>
        </fieldset>
        {message && (
          <p className="form-message" role="alert">
            {message}
          </p>
        )}
        <div className="dialog-actions">
          <button className="button-quiet" type="button" onClick={onClose}>
            Close
          </button>
          <button className="button-primary" type="submit" disabled={busy}>
            {busy ? "Checking…" : "Prepare download"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
