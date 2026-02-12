"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import HomePage from '@/components/home/HomePage';

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
    const handleSelectCategory = (category: any) => {
        // A simple reset mechanism: reload the page to the specific category if possible, or just reload.
        // This is a basic fallback, could be improved.
        if (category.id === 'ajustes') {
            window.location.href = '/?view=settings';
        } else {
             window.location.href = '/';
        }
    };
    
    // This is a simplified HomePage that doesn't rely on MainApp's navigation state
    return (
        <HomePage
          onSelectCategory={handleSelectCategory}
          onOpenCustomPlan={() => {
            window.location.href = '/';
          }}
          onCreateCustomPlan={() => {
            window.location.href = '/';
          }}
        />
    );
}


export default ErrorBoundary;
