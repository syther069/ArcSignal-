import React from 'react';
import Image from 'next/image';

export default function Logo({ className = '', width = 32, height = 32 }: { className?: string; width?: number; height?: number }) {
  return (
    <Image 
      src="/logo.png" 
      alt="ArcSignal Logo" 
      width={width} 
      height={height} 
      className={`object-contain ${className}`}
    />
  );
}
