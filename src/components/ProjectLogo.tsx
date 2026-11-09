import React from 'react';

interface ProjectLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function ProjectLogo({ size = 'md', showText = true, className = '' }: ProjectLogoProps) {
  const sizeClasses = {
    sm: { container: 'w-7 h-7 rounded-lg', icon: 'w-4 h-4', title: 'text-xs', sub: 'text-[9px]' },
    md: { container: 'w-9 h-9 rounded-xl', icon: 'w-5 h-5', title: 'text-sm', sub: 'text-[10px]' },
    lg: { container: 'w-12 h-12 rounded-2xl', icon: 'w-7 h-7', title: 'text-lg', sub: 'text-xs' },
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Sleek AI Sales Forecasting Logo Badge */}
      <div
        className={`${currentSize.container} bg-gradient-to-br from-emerald-500/20 via-primary/20 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center text-primary shadow-md shrink-0 relative overflow-hidden group`}
      >
        <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/15 transition-colors duration-300" />
        <svg
          className={`${currentSize.icon} text-emerald-400 group-hover:scale-110 transition-transform duration-300 relative z-10`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Axis baseline */}
          <path d="M3 3v18h18" strokeOpacity="0.35" />
          {/* Predictive Trend Line */}
          <path d="M7 16l4-5 3 3 6-7" className="text-emerald-400" />
          {/* Target Forecast Node */}
          <circle cx="20" cy="7" r="2.5" className="fill-emerald-400 stroke-none animate-pulse" />
          {/* AI Hybrid Spark */}
          <path d="M12 6.5l0.8 1.6 1.7 0.8-1.7 0.8-0.8 1.6-0.8-1.6-1.7-0.8 1.7-0.8z" fill="currentColor" stroke="none" className="text-amber-400" />
        </svg>
      </div>

      {showText && (
        <div className="min-w-0">
          <h1 className={`${currentSize.title} font-bold text-gradient tracking-tight leading-none truncate`}>
            SV Forecast AI
          </h1>
          <p className={`${currentSize.sub} text-muted-foreground font-mono mt-1 flex items-center gap-1`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            XGBoost–LSTM v3.2
          </p>
        </div>
      )}
    </div>
  );
}
