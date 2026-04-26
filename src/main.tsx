import * as React from 'react';
import { StrictMode, type ReactNode } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

interface RootErrorBoundaryProps {
  children: ReactNode;
}

class RootErrorBoundary extends React.Component<RootErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Unknown runtime error' };
  }

  componentDidCatch(error: Error) {
    console.error('Root render crash:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <div style={{ maxWidth: '720px', width: '100%', border: '1px solid #fecaca', background: '#fff1f2', borderRadius: '16px', padding: '20px' }}>
            <h2 style={{ margin: 0, marginBottom: '8px', color: '#9f1239', fontSize: '20px' }}>Student UI crashed during render</h2>
            <p style={{ margin: 0, color: '#881337', lineHeight: 1.5 }}>
              {this.state.message}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
