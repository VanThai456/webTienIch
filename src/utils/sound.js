// Web Audio API Synthesizer - Giả lập tiếng chuông nhà hàng "Ting Ting" cao cấp
// Không cần tải file mp3 bên ngoài, không lo lỗi 404, chạy 100% mượt trên mọi trình duyệt

class SoundService {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Tiếng chuông Ting Ting khi có đơn mới
  playOrderBell() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      
      // Nốt 1 (Cao, thanh thoát)
      this.playTone(ctx, 1046.5, now, 0.45, 0.25); // C6
      // Nốt 2 (Hòa âm ngân vang)
      this.playTone(ctx, 1318.51, now + 0.12, 0.7, 0.35); // E6
      // Nốt 3 (Kết thúc ngân dài)
      this.playTone(ctx, 1567.98, now + 0.25, 1.2, 0.4); // G6
    } catch (e) {
      console.warn('Không thể phát âm thanh:', e);
    }
  }

  // Tiếng chuông khẩn cấp khi Khách gọi nhân viên hoặc Gọi tính tiền
  playAlertBell() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      this.playTone(ctx, 880, now, 0.2, 0.3); // A5
      this.playTone(ctx, 1174.66, now + 0.15, 0.5, 0.35); // D6
    } catch (e) {
      console.warn('Không thể phát âm thanh:', e);
    }
  }

  // Âm thanh bấm nút nhẹ
  playClick() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      this.playTone(ctx, 800, ctx.currentTime, 0.05, 0.08);
    } catch {
      // Bỏ qua lỗi audio
    }
  }

  playTone(ctx, freq, startTime, duration, maxGain = 0.3) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Envelope tiếng chuông ngân tự nhiên (Attack cực nhanh, Decay dần)
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(maxGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

export const soundManager = new SoundService();

