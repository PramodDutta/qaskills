'use client';

import { Component, type ReactNode } from 'react';

interface WebinarBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

/** A webinar placement must never take a page down: on any error, render the fallback. */
export class WebinarBoundary extends Component<WebinarBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
