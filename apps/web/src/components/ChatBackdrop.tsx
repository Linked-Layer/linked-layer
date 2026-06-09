/**
 * Ambient backdrop for the chat view — a single soft indigo glow pooled at the
 * top, echoing the sidebar's accent (the active-chat marker) so the two zones
 * read as one surface. Static and `pointer-events-none`, so it never fights
 * legibility or stalls the renderer. Mounted only by ChatApp (/app).
 */
export function ChatBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Soft indigo glow at the top — brighter in light mode so it actually reads
          against the near-white background. */}
      <div
        className="absolute -top-56 left-1/2 h-[28rem] w-[130%] -translate-x-1/2 rounded-[50%] opacity-[0.18] blur-3xl dark:opacity-20"
        style={{ background: "rgb(var(--accent))" }}
      />
    </div>
  );
}
