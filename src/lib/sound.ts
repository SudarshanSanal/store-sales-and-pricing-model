// ── Enterprise Notification Sound & Desktop Notification Manager ──────────────
// Features:
// 1. User-interaction unlock mechanism (AudioContext & HTML5 Audio)
// 2. Dual playback engine (Web Audio API Synthesizer + /sounds/notification.mp3 fallback)
// 3. Sound spam throttling (max 1 chime per 1.5s)
// 4. Volume control and localStorage persistence
// 5. Native Desktop Browser Notification API integration

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;
  private lastPlayedTime = 0;
  private fallbackAudio: HTMLAudioElement | null = null;

  constructor() {
    this.initUserInteractionUnlock();
  }

  /**
   * Automatically unlocks AudioContext and HTML5 Audio upon first user interaction
   */
  private initUserInteractionUnlock(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      if (this.isUnlocked) return;
      
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        if (AudioCtx) {
          if (!this.audioCtx) this.audioCtx = new AudioCtx();
          if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
          }
        }

        // Preload HTML5 audio
        if (!this.fallbackAudio) {
          this.fallbackAudio = new Audio('/sounds/notification.mp3');
          this.fallbackAudio.preload = 'auto';
          this.fallbackAudio.volume = this.getVolume();
        }

        this.isUnlocked = true;
        console.log('[Notification Sound] Audio system successfully unlocked by user interaction');
      } catch (err) {
        console.warn('[Notification Sound] Audio unlock error:', err);
      } finally {
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      }
    };

    window.addEventListener('click', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!this.audioCtx && AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  public isSoundEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('sv_notif_sound_enabled') !== 'false';
  }

  public setSoundEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sv_notif_sound_enabled', enabled ? 'true' : 'false');
  }

  public getVolume(): number {
    if (typeof window === 'undefined') return 0.8;
    const v = localStorage.getItem('sv_notif_volume');
    return v ? Math.max(0, Math.min(1, parseFloat(v))) : 0.8;
  }

  public setVolume(vol: number): void {
    if (typeof window === 'undefined') return;
    const clamped = Math.max(0, Math.min(1, vol));
    localStorage.setItem('sv_notif_volume', String(clamped));
    if (this.fallbackAudio) {
      this.fallbackAudio.volume = clamped;
    }
  }

  /**
   * Plays the notification chime with throttling to prevent sound spam
   */
  public playNotificationChime(force = false): void {
    if (!force && !this.isSoundEnabled()) return;

    const now = Date.now();
    // Throttling: do not play more than once every 1500ms
    if (!force && now - this.lastPlayedTime < 1500) {
      console.log('[Notification Sound] Sound request throttled (spam prevention)');
      return;
    }
    this.lastPlayedTime = now;

    const vol = this.getVolume();
    if (vol <= 0) return;

    const ctx = this.getContext();

    if (ctx && ctx.state !== 'suspended') {
      try {
        const ct = ctx.currentTime;

        // Tone 1: 698.46 Hz (F5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(698.46, ct);
        gain1.gain.setValueAtTime(0, ct);
        gain1.gain.linearRampToValueAtTime(0.2 * vol, ct + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.0001, ct + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ct);
        osc1.stop(ct + 0.35);

        // Tone 2: 1046.50 Hz (C6)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, ct + 0.08);
        gain2.gain.setValueAtTime(0, ct + 0.08);
        gain2.gain.linearRampToValueAtTime(0.25 * vol, ct + 0.10);
        gain2.gain.exponentialRampToValueAtTime(0.0001, ct + 0.65);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ct + 0.08);
        osc2.stop(ct + 0.65);

        // Shimmer overtone (E6 - 1318.51 Hz)
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(1318.51, ct + 0.12);
        gain3.gain.setValueAtTime(0, ct + 0.12);
        gain3.gain.linearRampToValueAtTime(0.08 * vol, ct + 0.14);
        gain3.gain.exponentialRampToValueAtTime(0.0001, ct + 0.5);
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.start(ct + 0.12);
        osc3.stop(ct + 0.5);

        console.log('[Notification Sound] Web Audio chime played successfully');
        return;
      } catch (err) {
        console.warn('[Notification Sound] Web Audio failed, trying fallback HTML5 Audio:', err);
      }
    }

    // Fallback: HTML5 Audio
    try {
      if (!this.fallbackAudio) {
        this.fallbackAudio = new Audio('/sounds/notification.mp3');
        this.fallbackAudio.preload = 'auto';
      }
      this.fallbackAudio.volume = vol;
      this.fallbackAudio.currentTime = 0;
      const playPromise = this.fallbackAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => console.log('[Notification Sound] HTML5 audio fallback played successfully'))
          .catch(err => {
            console.warn('[Notification Sound] Autoplay blocked or not allowed:', err.message);
          });
      }
    } catch (err) {
      console.warn('[Notification Sound] Audio playback error:', err);
    }
  }

  // ── Browser Desktop Notifications ──────────────────────────────────────────

  public isDesktopNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getDesktopPermission(): NotificationPermission {
    if (!this.isDesktopNotificationSupported()) return 'denied';
    return Notification.permission;
  }

  public async requestDesktopPermission(): Promise<boolean> {
    if (!this.isDesktopNotificationSupported()) return false;
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }

  public showDesktopNotification(title: string, options?: { body?: string; icon?: string }): void {
    if (!this.isDesktopNotificationSupported()) return;
    if (Notification.permission !== 'granted') return;

    try {
      const notif = new Notification(title, {
        body: options?.body || '',
        icon: options?.icon || '/favicon.svg',
        silent: true // sound is handled directly by soundFx
      });

      // Auto-close after 6 seconds
      setTimeout(() => notif.close(), 6000);
    } catch (err) {
      console.warn('[Browser Notification] Display error:', err);
    }
  }
}

export const soundFx = new SoundManager();
