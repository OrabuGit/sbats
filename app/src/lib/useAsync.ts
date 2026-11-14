import { useEffect, useState } from 'react';

export type Async<T> = { status: 'loading' } | { status: 'ready'; value: T } | { status: 'error'; message: string };

/** Runs an async loader when `key` changes and reports loading, the value, or the error. */
export function useAsync<T>(load: () => Promise<T>, key: string): Async<T> {
  const [state, setState] = useState<Async<T>>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    load().then(
      (value) => alive && setState({ status: 'ready', value }),
      (e) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}
