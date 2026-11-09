import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Briefcase, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProjectLogo } from '@/components/ProjectLogo';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');

  // Eye toggles
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-transparent' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
    if (pass.length >= 8 && /[A-Z]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score === 1) return { score, label: 'Weak', color: 'bg-red-500 w-1/3' };
    if (score === 2) return { score, label: 'Medium', color: 'bg-amber-500 w-2/3' };
    return { score, label: 'Strong', color: 'bg-emerald-500 w-full' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    if (tab === 'signup') {
      if (!name) {
        toast.error('Please enter your full name');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }
    }

    setLoading(true);
    try {
      if (tab === 'signin') {
        await signIn(email, password);
        toast.success('Successfully logged in!');
      } else {
        await signUp(email, password, name, company);
        toast.success('Registration successful! Welcome to HybridForecaster.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState('');

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md glass-card p-8 border border-border/80 shadow-2xl relative overflow-hidden glow-subtle"
      >
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <ProjectLogo size="lg" showText={false} />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
            <ShieldCheck className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-mono text-primary font-bold">Enterprise AI Authentication</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gradient tracking-tight">SV Forecast AI</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">Hybrid XGBoost–LSTM Sales Forecasting Platform</p>
        </div>

        {/* Tab selector */}
        <div className="flex p-1 rounded-xl bg-muted/40 border border-border/60 mb-6">
          <button
            onClick={() => { setTab('signin'); setError(''); }}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition-all ${
              tab === 'signin'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('signup'); setError(''); }}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition-all ${
              tab === 'signup'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'signup' && (
            <>
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/30 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground"
                  />
                </div>
              </div>

              {/* Company Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Company Name</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Enter company name"
                    className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/30 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/30 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 text-sm bg-secondary/30 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Password strength UI */}
            {tab === 'signup' && password.length > 0 && (
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Strength:</span>
                  <span className={
                    strength.score === 1 ? 'text-red-400 font-bold' :
                    strength.score === 2 ? 'text-amber-400 font-bold' :
                    'text-emerald-400 font-bold'
                  }>{strength.label}</span>
                </div>
                <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} />
                </div>
              </div>
            )}
          </div>

          {tab === 'signup' && (
            /* Confirm Password */
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm bg-secondary/30 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground font-mono text-sm font-bold rounded-lg hover:bg-primary/95 transition-all shadow-lg shadow-primary/10 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing…
              </>
            ) : (
              tab === 'signin' ? 'Sign In' : 'Register Account'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
