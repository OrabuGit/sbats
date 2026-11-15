import { Component, type ErrorInfo, type ReactNode } from 'react';

/** A page file that could not be fetched (a flaky network or a new deploy): retrying in place cannot help, a reload can. */
const CHUNK_FAILURE = /dynamically imported module|Failed to fetch|Importing a module script failed|ChunkLoadError/i;

interface Props {
  /** Names the part that failed, in the message. */
  what: string;
  /** Changing this clears a shown error, as when the visitor moves to another page. */
  resetKey?: string;
  /** Goes back to the landing page. */
  onHome?: () => void;
  children: ReactNode;
}

/**
 * A failure inside a page shows a message and a way back, never a blank screen. The page is re-tried when the key
 * of the parent changes, so moving to another page clears the error.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`SBATS: ${this.props.what} failed`, error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main className="flex min-h-[60svh] flex-1 flex-col items-start justify-center gap-4 bg-bg px-5 py-16 sm:px-10 lg:px-16" role="alert">
        <p className="label">Something went wrong</p>
        <h1 className="display-l max-w-[24ch] text-[30px] sm:text-[44px]">This part of SBATS could not be shown.</h1>
        <p className="max-w-[60ch] text-[16px] leading-6 text-muted">
          {this.props.what} stopped with an error. Nothing you entered was sent anywhere. You can try again, or go back to the home page.
        </p>
        <p className="num max-w-[70ch] break-words text-[12px] text-muted">{error.message}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={() => (CHUNK_FAILURE.test(error.message) ? window.location.reload() : this.setState({ error: null }))}>
            Try again
          </button>
          {this.props.onHome && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                this.setState({ error: null });
                this.props.onHome?.();
              }}
            >
              Back to home
            </button>
          )}
        </div>
      </main>
    );
  }
}
