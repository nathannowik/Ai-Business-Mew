'use client';

import { useRef } from 'react';

/**
 * Opens the combined batch PDF in a hidden iframe and triggers the browser's print
 * dialog — the closest a hosted web app gets to "send to printer". Falls back to
 * opening the PDF in a new tab if the print call is blocked.
 */
export function PrintButton({ url, label = '⎙ Print batch' }: { url: string; label?: string }) {
  const ref = useRef<HTMLIFrameElement | null>(null);

  function print() {
    const iframe = ref.current;
    if (!iframe) return;
    iframe.src = url;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.open(url, '_blank');
      }
    };
  }

  return (
    <>
      <button className="btn primary" type="button" onClick={print}>{label}</button>
      <iframe ref={ref} title="print" style={{ display: 'none' }} />
    </>
  );
}
