/** A small visible mark under a set of drawings that were generated with AI. */
export function AiMark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block text-[12px] leading-[18px] text-muted ${className}`} title="Drawn in code with AI assistance. See AI assistance in the footer.">
      AI-generated drawings
    </span>
  );
}
