import React from 'react';

export function ProgressBar({ value }) {
  return (
    <div className="w-full bg-blue-100 rounded-full h-4">
      <div
        className="bg-blue-600 h-4 rounded-full transition-all duration-300"
        style={{ width: `${value}%` }}
      ></div>
    </div>
  );
} 