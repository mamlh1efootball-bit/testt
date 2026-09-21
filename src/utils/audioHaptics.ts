// Native APK feel: Audio click & Haptic vibration feedback

class SoundHapticService {
  private audioCtx: AudioContext | null = null;
  public soundEnabled: boolean = true;
  public hapticEnabled: boolean = true;

  constructor() {
    // Load preference from localStorage if available
    try {
      const savedSound = localStorage.getItem('apex_sound_enabled');
      if (savedSound !== null) this.soundEnabled = savedSound === 'true';
      const savedHaptic = localStorage.getItem('apex_haptic_enabled');
      if (savedHaptic !== null) this.hapticEnabled = savedHaptic === 'true';
    } catch {
      // ignore
    }
  }

  private initAudio() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
  }

  public triggerKeyFeedback(type: 'tap' | 'action' | 'clear' | 'equals' = 'tap') {
    // 1. Haptic Vibration (Android native feel)
    if (this.hapticEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (type === 'equals') {
          navigator.vibrate([15, 30, 20]);
        } else if (type === 'clear') {
          navigator.vibrate(25);
        } else {
          navigator.vibrate(10);
        }
      } catch {
        // ignore vibration error
      }
    }

    // 2. Subtle Audio feedback
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (type === 'equals') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'clear') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.07);
      } else {
        // Crisp soft mechanical click
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(type === 'action' ? 440 : 360, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      }
    } catch {
      // AudioContext may be restricted before user gesture
    }
  }

  public toggleSound(val?: boolean): boolean {
    this.soundEnabled = val !== undefined ? val : !this.soundEnabled;
    try {
      localStorage.setItem('apex_sound_enabled', String(this.soundEnabled));
    } catch {}
    return this.soundEnabled;
  }

  public toggleHaptic(val?: boolean): boolean {
    this.hapticEnabled = val !== undefined ? val : !this.hapticEnabled;
    try {
      localStorage.setItem('apex_haptic_enabled', String(this.hapticEnabled));
    } catch {}
    return this.hapticEnabled;
  }
}

export const soundHaptic = new SoundHapticService();
