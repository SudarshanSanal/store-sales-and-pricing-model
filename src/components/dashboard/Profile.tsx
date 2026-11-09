import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Lock, Eye, EyeOff, Loader2, CheckCircle2, LogOut, AlertTriangle, Bell, Edit2, Send, Palette } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const BACKEND_URL = (typeof window !== 'undefined' ? (window.location.origin.includes('localhost') && window.location.port === '8080' ? 'http://localhost:5000' : '') : '');

export function Profile({ onVerifyClick }: { onVerifyClick?: () => void }) {
  const { session, signOut, profile, changeEmail, verifyEmail, resendVerificationOtp } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Email Change State
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  // Notification Preferences State
  const [prefs, setPrefs] = useState({
    forecastCompleted: true,
    reportGenerated: true,
    stockoutWarning: true,
    highDemandAlert: true,
    pricingRecommendation: true,
    dailyReport: false,
    weeklyReport: false,
    monthlyReport: true
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!session?.token) return;
    fetch(`${BACKEND_URL}/api/notification-preferences`, {
      headers: { Authorization: `Bearer ${session.token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data) {
          setPrefs({
            forecastCompleted: !!data.forecastCompleted,
            reportGenerated: !!data.reportGenerated,
            stockoutWarning: !!data.stockoutWarning,
            highDemandAlert: !!data.highDemandAlert,
            pricingRecommendation: !!data.pricingRecommendation,
            dailyReport: !!data.dailyReport,
            weeklyReport: !!data.weeklyReport,
            monthlyReport: !!data.monthlyReport,
          });
        }
      })
      .catch(() => {});
  }, [session?.token]);

  if (!session) return null;
  const { user } = session;

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      toast.success('Password changed successfully');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleInitiateEmailChange = async () => {
    if (!newEmailInput || !newEmailInput.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSavingEmail(true);
    try {
      const msg = await changeEmail(newEmailInput);
      toast.success(msg || 'Verification OTP sent to your new email address');
      setEmailOtpSent(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleConfirmEmailOtp = async () => {
    if (emailOtp.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }
    setSavingEmail(true);
    try {
      await verifyEmail(emailOtp);
      toast.success('✓ New email address verified and updated successfully');
      setChangingEmail(false);
      setEmailOtpSent(false);
      setNewEmailInput('');
      setEmailOtp('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleTogglePref = (key: keyof typeof prefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePreferences = async () => {
    if (!session?.token) return;
    setSavingPrefs(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/notification-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify(prefs)
      });
      if (!res.ok) throw new Error('Failed to update notification preferences');
      toast.success('✓ Notification preferences saved');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPrefs(false);
    }
  };

  const joinedDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* User Info & Email Status */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/20">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{user.name}</h2>
              <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
            </div>
          </div>

          {/* Email Verification Badge (Requirement #4) */}
          <div className="flex items-center gap-2">
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Email Verified
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" /> Email Not Verified
                </span>
                {onVerifyClick && (
                  <button
                    onClick={onVerifyClick}
                    className="px-3 py-1 rounded-lg bg-primary text-primary-foreground font-mono text-xs font-bold hover:bg-primary/90 transition-all shadow-md"
                  >
                    Verify Email
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-secondary/30 border border-border space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <User className="w-3.5 h-3.5" /> Full Name
            </div>
            <p className="text-sm font-medium text-foreground">{user.name}</p>
          </div>

          <div className="p-3 rounded-xl bg-secondary/30 border border-border space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <Mail className="w-3.5 h-3.5" /> Email Address
              </div>
              <button
                onClick={() => setChangingEmail(!changingEmail)}
                className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-2.5 h-2.5" /> Change
              </button>
            </div>
            <p className="text-sm font-medium text-foreground">{user.email}</p>
          </div>

          <div className="p-3 rounded-xl bg-secondary/30 border border-border space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Shield className="w-3.5 h-3.5" /> Member Since
            </div>
            <p className="text-sm font-medium text-foreground">{joinedDate}</p>
          </div>

          <div className="p-3 rounded-xl bg-secondary/30 border border-border space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Lock className="w-3.5 h-3.5" /> Account ID
            </div>
            <p className="text-sm font-medium text-foreground font-mono truncate">{user.id?.slice(-8)}</p>
          </div>
        </div>

        {/* Change Email Form (Requirement #5) */}
        {changingEmail && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-border/60 space-y-3">
            <h4 className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">Change Email Address</h4>
            {!emailOtpSent ? (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmailInput}
                  onChange={e => setNewEmailInput(e.target.value)}
                  placeholder="Enter new email address"
                  className="flex-1 px-3 py-2 text-xs bg-secondary/40 border border-border rounded-lg focus:outline-none focus:border-primary text-foreground"
                />
                <button
                  onClick={handleInitiateEmailChange}
                  disabled={savingEmail}
                  className="px-4 py-2 bg-primary text-primary-foreground font-mono text-xs font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>Send OTP</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-mono">Enter the 6-digit OTP sent to {newEmailInput}:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={emailOtp}
                    onChange={e => setEmailOtp(e.target.value)}
                    placeholder="6-digit OTP"
                    className="w-32 px-3 py-2 text-xs text-center font-mono font-bold bg-secondary/40 border border-border rounded-lg focus:outline-none focus:border-primary text-foreground tracking-widest"
                  />
                  <button
                    onClick={handleConfirmEmailOtp}
                    disabled={savingEmail}
                    className="px-4 py-2 bg-emerald-600 text-white font-mono text-xs font-bold rounded-lg hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {savingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    <span>Verify & Save</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Appearance & Theme Settings */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 font-mono">
            <Palette className="w-4 h-4 text-primary" /> Appearance & Theme Mode
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Customize your interface theme mode across Light, Dark, or System Sync</p>
        </div>

        <ThemeToggle variant="profile" />
      </motion.div>

      {/* Notification Preferences (Requirement #9) */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 font-mono">
            <Bell className="w-4 h-4 text-primary" /> Notification Preferences
          </h3>
          <button
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {savingPrefs ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save Preferences
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/30 border border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors">
            <input type="checkbox" checked={prefs.forecastCompleted} onChange={() => handleTogglePref('forecastCompleted')} className="rounded border-border text-primary focus:ring-primary" />
            <span>✓ Forecast completed</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/30 border border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors">
            <input type="checkbox" checked={prefs.reportGenerated} onChange={() => handleTogglePref('reportGenerated')} className="rounded border-border text-primary focus:ring-primary" />
            <span>✓ Report generated</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/30 border border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors">
            <input type="checkbox" checked={prefs.stockoutWarning} onChange={() => handleTogglePref('stockoutWarning')} className="rounded border-border text-primary focus:ring-primary" />
            <span>⚠ Stockout warning</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/30 border border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors">
            <input type="checkbox" checked={prefs.highDemandAlert} onChange={() => handleTogglePref('highDemandAlert')} className="rounded border-border text-primary focus:ring-primary" />
            <span>📈 High demand alert</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/30 border border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors">
            <input type="checkbox" checked={prefs.pricingRecommendation} onChange={() => handleTogglePref('pricingRecommendation')} className="rounded border-border text-primary focus:ring-primary" />
            <span>💰 Pricing recommendation</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/30 border border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors">
            <input type="checkbox" checked={prefs.monthlyReport} onChange={() => handleTogglePref('monthlyReport')} className="rounded border-border text-primary focus:ring-primary" />
            <span>📄 Monthly report</span>
          </label>
        </div>
      </motion.div>

      {/* Change Password */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 font-mono">
            <Lock className="w-4 h-4 text-primary" /> Security & Password
          </h3>
        </div>

        {!changingPassword ? (
          <button onClick={() => setChangingPassword(true)} className="w-full px-4 py-2.5 text-xs font-mono font-bold rounded-lg bg-secondary/50 border border-border text-foreground hover:bg-secondary transition-colors">
            Change Password
          </button>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <label className="text-xs font-mono text-muted-foreground">Current Password</label>
              <div className="relative mt-1">
                <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 pr-10 text-sm bg-secondary/30 border border-border rounded-lg focus:outline-none focus:border-primary text-foreground" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="relative">
              <label className="text-xs font-mono text-muted-foreground">New Password</label>
              <div className="relative mt-1">
                <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 pr-10 text-sm bg-secondary/30 border border-border rounded-lg focus:outline-none focus:border-primary text-foreground" />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm bg-secondary/30 border border-border rounded-lg focus:outline-none focus:border-primary text-foreground" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setChangingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} className="px-4 py-2 text-xs font-mono rounded-lg bg-secondary text-foreground hover:bg-secondary/80">Cancel</button>
              <button onClick={handleChangePassword} disabled={savingPassword} className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5">
                {savingPassword ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Update Password
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Logout */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <button onClick={signOut} className="w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-mono font-bold flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </motion.div>
    </div>
  );
}
