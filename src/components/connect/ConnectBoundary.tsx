'use client';

import { Component, type ReactNode } from 'react';
import Link from 'next/link';
import './connect.css';

export default class ConnectBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL || this.state.failed) return <main className="connect-world"><div className="connect-wrap connect-panel"><h1 className="connect-title">The camp connection needs a moment.</h1><p role="alert">{this.state.failed ? 'This view is no longer available. Your permissions may have changed, or the camp connection was interrupted.' : 'Campfire Connect needs the event backend configured.'}</p><div className="connect-row" style={{ marginTop: 24 }}><button className="connect-btn" onClick={() => location.reload()}>Reconnect</button><Link className="connect-btn" href="/">MAD SETTINGS home</Link></div></div></main>;
    return this.props.children;
  }
}
