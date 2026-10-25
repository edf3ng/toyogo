"use client";

import { Component, type ReactNode } from "react";

/**
 * The 3D model is fetched at runtime, and a failed fetch throws out of the
 * canvas. Without this the whole page is replaced by the client-error screen,
 * so the car falls back to its silhouette instead.
 */
export class ModelBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
