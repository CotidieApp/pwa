import React from "react";
import HomePage from "@/components/home/HomePage";

export function renderContent(navState: any, handlers: any) {
  switch (navState.activeView) {
    case "home":
      return (
        <HomePage
          onSelectCategory={handlers.handleSelectCategory}
          onOpenCustomPlan={handlers.handleOpenCustomPlan}
          onCreateCustomPlan={handlers.handleCreateCustomPlan}
        />
      );

    default:
      return null;
  }
}