"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SharePrintButton() {
  return (
    <Button variant="ghost" size="sm" className="h-9 rounded-full" onClick={() => window.print()}>
      <Printer /> Print / Save as PDF
    </Button>
  );
}
