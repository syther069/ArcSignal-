import React from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  glowColor?: string;
}

export function GlassCard({
  children,
  className = '',
  glow = false,
  glowColor = 'rgba(56, 189, 248, 0.1)',
  style,
  ...props
}: GlassCardProps) {
  const dynamicStyle = glow
    ? { boxShadow: `0 0 20px ${glowColor}`, ...style }
    : style;

  return (
    <div
      className={`glass-card ${className}`}
      style={dynamicStyle}
      {...props}
    >
      {children}
    </div>
  );
}
