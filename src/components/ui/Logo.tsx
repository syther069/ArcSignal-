import React from 'react';

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M50 15L85 75H15L50 15Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/>
      <path d="M50 15L67.5 45H32.5L50 15Z" fill="currentColor"/>
      <rect x="40" y="55" width="20" height="4" rx="2" fill="currentColor"/>
      <rect x="30" y="65" width="40" height="4" rx="2" fill="currentColor" fillOpacity="0.3"/>
    </svg>
  );
}
