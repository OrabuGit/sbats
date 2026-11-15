/** The end of a page: where AI was used, and a link to the full record. */
export function SiteFooter({ onAiUse }: { onAiUse: () => void }) {
  return (
    <footer className="mx-auto w-full max-w-[1200px] px-5 pb-10 pt-12 sm:px-10">
      <p className="border-t border-line pt-5 text-[13px] leading-5 text-muted">
        SBATS-26. Code, data compilation and written text were produced with AI assistance and reviewed by the team. Every number comes from a cited source.{' '}
        <button type="button" onClick={onAiUse} className="link-rule font-medium text-text">
          AI assistance
        </button>
      </p>
    </footer>
  );
}
