"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <FallbackUI />;
    }

    return this.props.children;
  }
}

// A functional component to use hooks inside the class component's render
function FallbackUI() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">OcurriÃ³ un error inesperado</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        La app no se reiniciarÃ¡ sin tu permiso. Puedes volver al inicio o recargar.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Ir al inicio
        </Button>
        <Button onClick={() => window.location.reload()}>
          Recargar
        </Button>
      </div>
    </div>
  );
}


export default ErrorBoundary;
