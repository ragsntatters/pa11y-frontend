import React from 'react';
import { ProgressBar } from './ui/ProgressBar';

export default function ScanProgress({ progress, statusMessage }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Running Accessibility Scan...</h1>
        <ProgressBar value={progress} />
        <p className="mt-4 text-blue-500">{statusMessage || 'Your report is being generated. This may take up to a minute.'}</p>
      </div>
    </div>
  );
} 