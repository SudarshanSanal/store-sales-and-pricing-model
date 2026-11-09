import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface EmailVerificationScreenProps {
  onSuccess?: () => void;
}

export function EmailVerificationScreen({ onSuccess }: EmailVerificationScreenProps) {
  const { user, verifyEmail, resendVerificationOtp, signOut } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(600); // 10 mins
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  // 10-minute expiry timer
  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input box
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) {
      toast.error('Please paste a valid 6-digit code');
      return;
    }
    const digits = pastedData.split('');
    setOtp(digits);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length !== 6) {
      toast.error('Please enter the complete 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(otpStr);
      setVerifiedSuccess(true);
      toast.success('✓ Email verified successfully');
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await resendVerificationOtp();
      toast.success('New 6-digit verification code sent to your email');
      setCooldown(60);
      setTimerSeconds(600);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (verifiedSuccess) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass-card p-8 text-center border border-border shadow-2xl space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">✓ Email Verified Successfully</h2>
          <p className="text-xs text-muted-foreground font-mono">Redirecting to your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      {/* Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-8 border border-border shadow-2xl relative overflow-hidden"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Verify Your Email</h1>
          <p className="text-xs text-muted-foreground font-sans mt-2 leading-relaxed">
            We sent a 6-digit verification code to your email address:<br />
            <span className="font-mono text-foreground font-semibold">{user?.email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          {/* OTP 6-box input */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-input-${idx}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-12 text-center text-lg font-bold font-mono bg-secondary/40 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 text-foreground transition-all"
              />
            ))}
          </div>

          {/* Expiry Timer */}
          <div className="text-center text-xs font-mono text-muted-foreground">
            {timerSeconds > 0 ? (
              <span>Code expires in <strong className="text-amber-400 font-bold">{formatTimer(timerSeconds)}</strong></span>
            ) : (
              <span className="text-destructive font-semibold">Verification code expired. Please request a new code.</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-mono text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/10"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Verify Email</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Resend & Sign out */}
        <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-mono">
          <div className="text-muted-foreground">
            Didn't receive code?{' '}
            <button
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="text-primary hover:underline font-bold disabled:opacity-50 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>

          <button
            onClick={() => signOut()}
            className="text-muted-foreground hover:text-foreground underline text-[11px]"
          >
            Sign out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
