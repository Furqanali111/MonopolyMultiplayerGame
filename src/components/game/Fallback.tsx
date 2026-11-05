import React from 'react';

/** If a 3D layer throws (lost WebGL context, chunk fails to load), show the flat version instead. */
export class Fallback extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode; onFail?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail?.();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
