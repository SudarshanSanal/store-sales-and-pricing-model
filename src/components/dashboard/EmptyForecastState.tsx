import { Inbox, Upload, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyForecastStateProps {
  title: string;
  hint?: string;
  onUploadClick?: () => void;
  buttonText?: string;
  compact?: boolean;
}

export function EmptyForecastState({ title, hint, onUploadClick, buttonText, compact }: EmptyForecastStateProps) {
  return (
    <div className={`glass-card text-center relative overflow-hidden group ${compact ? 'p-6 md:p-8' : 'p-10 md:p-14'}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4 shadow-sm group-hover:scale-105 transition-transform duration-300">
          <Inbox className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-base md:text-lg font-bold text-foreground tracking-tight">{title}</h3>
        <p className="text-xs md:text-sm font-mono text-muted-foreground mt-2 max-w-lg mx-auto leading-relaxed">
          {hint || 'Upload a CSV with date, product, and sales columns. We\'ll train a hybrid XGBoost-LSTM model and unlock every dashboard tab.'}
        </p>
        {onUploadClick && (
          <Button onClick={onUploadClick} className="mt-6 gap-2 shadow-sm font-medium" size="sm">
            <Upload className="w-4 h-4" />
            {buttonText || 'Upload data'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}