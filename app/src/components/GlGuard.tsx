import { Component, type ReactNode } from 'react';
import { markWebglBroken } from '../lib/gl';

/**
 * Wraps a WebGL view. If it fails to start, even though the probe passed (a lost context, too many contexts, a driver
 * fault), the flat version is shown instead and later views skip WebGL.
 */
export class GlGuard extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('SBATS: a 3D view could not start, showing the flat version', error);
    markWebglBroken();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
