import React, { FC, ReactNode } from 'react';

interface BadgeProps {
  color?: 'primary' | 'success' | 'warning' | 'error';
  children: ReactNode;
}

const colorMap = {
  primary: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
};

export const Badge: FC<BadgeProps> = ({ color = 'primary', children }) => (
  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${colorMap[color]}`}>{children}</span>
); 