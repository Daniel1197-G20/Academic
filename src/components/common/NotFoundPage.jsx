import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button, StudoraMark } from '../ui';

export function NotFoundPage({ onBackToStudora }) {
  return (
    <div className="min-h-[500px] w-full flex items-center justify-center p-6 bg-canvas text-ink antialiased">
      <div className="max-w-md w-full bg-white border border-border rounded-card p-6 sm:p-8 shadow-card text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-academic-100 flex items-center justify-center text-academic border border-academic-200/60 shadow-tactile-surface">
          <StudoraMark className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-academic-50 text-academic border border-academic-200">
            404 ERROR
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-sans">
            Page not found
          </h1>
          <p className="text-xs sm:text-sm text-muted max-w-xs mx-auto leading-relaxed">
            The page you're looking for doesn't exist.
          </p>
        </div>

        <div className="pt-2">
          <Button
            variant="academic"
            size="md"
            onClick={onBackToStudora}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 shadow-tactile-btn px-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Studora</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
