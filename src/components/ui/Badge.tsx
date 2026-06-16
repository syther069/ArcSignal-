import React from 'react';

export type BadgeVariant =
  | 'football'
  | 'crypto'
  | 'high'
  | 'medium'
  | 'low'
  | 'follow'
  | 'fade'
  | 'live'
  | 'upcoming'
  | 'resolved'
  | 'win'
  | 'loss';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant;
  label?: string;
}

export function Badge({ variant, label, children, className = '', ...props }: BadgeProps) {
  const baseStyles =
    'inline-flex items-center justify-center uppercase text-[11px] font-[family-name:var(--font-jetbrains-mono)] tracking-[0.08em] rounded-[3px] px-2 py-0.5 font-medium border';

  let variantStyles = '';

  switch (variant) {
    case 'football':
      variantStyles = 'text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]';
      break;
    case 'crypto':
      variantStyles = 'text-[#818cf8] bg-[#818cf8]/10 border-transparent';
      break;
    case 'high':
      variantStyles = 'text-[#34d399] bg-[#34d399]/10 border-transparent';
      break;
    case 'medium':
      variantStyles = 'text-[#fbbf24] bg-[#fbbf24]/10 border-transparent';
      break;
    case 'low':
      variantStyles = 'text-[#f87171] bg-[#f87171]/10 border-transparent';
      break;
    case 'follow':
      variantStyles = 'bg-[#34d399] text-[#020817] border-transparent font-bold';
      break;
    case 'fade':
      variantStyles = 'bg-[#f87171] text-[#020817] border-transparent font-bold';
      break;
    case 'live':
      variantStyles = 'text-[#34d399] bg-[#34d399]/5 border-[#34d399]/20';
      break;
    case 'upcoming':
      variantStyles = 'text-[#64748b] bg-[#64748b]/5 border-[#64748b]/20';
      break;
    case 'resolved':
      variantStyles = 'text-[#64748b] bg-[#64748b]/10 border-[#64748b]/50 line-through decoration-[#f87171]/50';
      break;
    case 'win':
      variantStyles = 'text-[#34d399] bg-[#34d399]/10 border-transparent';
      break;
    case 'loss':
      variantStyles = 'text-[#f87171] bg-[#f87171]/10 border-transparent';
      break;
    default:
      variantStyles = 'text-gray-400 bg-gray-800 border-transparent';
  }

  return (
    <span className={`${baseStyles} ${variantStyles} ${className}`} {...props}>
      {variant === 'live' && (
        <span className="relative flex h-1.5 w-1.5 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#34d399]"></span>
        </span>
      )}
      {label || children}
    </span>
  );
}
