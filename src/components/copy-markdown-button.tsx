"use client";

import { useState } from "react";

export function CopyMarkdownButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="btn-secondary"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? "Ata copiada" : "Copiar ata"}
    </button>
  );
}
