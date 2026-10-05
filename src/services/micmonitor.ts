// Keeps one microphone stream open and measures its loudness, so the call
// doesn't have to reopen the mic (slow) on every turn. Also provides a
// "barge-in" detector that notices when the caller talks over the assistant.

const FFT_SIZE = 1024;

export class MicMonitor {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private samples = new Float32Array(FFT_SIZE);
  private pending: Promise<MediaStream> | null = null;
  private generation = 0;

  static isSupported() {
    return (
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof window !== "undefined" &&
      typeof window.AudioContext !== "undefined"
    );
  }

  get isOpen() {
    return Boolean(
      this.stream?.getAudioTracks().some((track) => track.readyState === "live"),
    );
  }

  /** Opens the mic (or returns the already-open stream). */
  async acquire(): Promise<MediaStream> {
    if (this.isOpen && this.stream && this.analyser) return this.stream;
    if (this.pending) return this.pending;
    this.releaseResources();

    const generation = this.generation;
    const pending = (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Microphone was released while opening.");
      }
      const context = new window.AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      context.createMediaStreamSource(stream).connect(analyser);
      await context.resume().catch(() => undefined);
      if (generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        void context.close().catch(() => undefined);
        throw new Error("Microphone was released while opening.");
      }
      this.stream = stream;
      this.context = context;
      this.analyser = analyser;
      return stream;
    })();

    this.pending = pending;
    try {
      return await pending;
    } finally {
      if (this.pending === pending) this.pending = null;
    }
  }

  /** Current loudness (RMS), roughly 0 (silence) to 0.3+ (loud voice). */
  level(): number {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.samples);
    let total = 0;
    for (const sample of this.samples) total += sample * sample;
    return Math.sqrt(total / this.samples.length);
  }

  /** Closes the mic completely (mute, end of call, or before native recognition). */
  release(): void {
    this.generation += 1;
    this.pending = null;
    this.releaseResources();
  }

  private releaseResources() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.analyser?.disconnect();
    this.analyser = null;
    if (this.context && this.context.state !== "closed") {
      void this.context.close().catch(() => undefined);
    }
    this.context = null;
  }
}

export interface BargeInOptions {
  /** Called once when the caller starts talking over the assistant. */
  onBargeIn: () => void;
  /** Lowest loudness that can ever count as the caller's voice. */
  minThreshold?: number;
  /** Caller must be this many times louder than the assistant's echo. */
  echoMultiplier?: number;
  /** Background noise level learned while the caller was quiet. */
  noiseFloor?: number;
  /** How long the caller must be talking before we interrupt. */
  requiredMs?: number;
  /** Time spent learning how loud the assistant's own voice is. */
  warmupMs?: number;
  intervalMs?: number;
  /** Optional: receive live levels for on-screen debugging. */
  onLevel?: (level: number, threshold: number) => void;
}

/**
 * Watches the mic while the assistant is speaking. It learns how loud the
 * assistant's own voice is through the speaker (echo), then fires onBargeIn
 * when the input is clearly louder than that for long enough.
 * Returns a function that stops the detector.
 */
export const startBargeInDetector = (
  monitor: MicMonitor,
  {
    onBargeIn,
    minThreshold = 0.03,
    echoMultiplier = 2.5,
    noiseFloor = 0,
    requiredMs = 250,
    warmupMs = 400,
    intervalMs = 50,
    onLevel,
  }: BargeInOptions,
): (() => void) => {
  const startedAt = Date.now();
  let echoLevel = 0;
  let loudMs = 0;
  let stopped = false;

  const timer = window.setInterval(() => {
    if (stopped) return;
    const now = Date.now();
    const level = monitor.level();

    // Warm-up: learn the assistant's echo level quickly, never trigger.
    if (now - startedAt < warmupMs) {
      echoLevel = echoLevel * 0.8 + level * 0.2;
      onLevel?.(level, Number.NaN);
      return;
    }

    const threshold = Math.max(
      minThreshold,
      echoLevel * echoMultiplier,
      noiseFloor * 3,
    );
    onLevel?.(level, threshold);

    if (level >= threshold) {
      loudMs += intervalMs;
      if (loudMs >= requiredMs) {
        stopped = true;
        window.clearInterval(timer);
        onBargeIn();
      }
      return;
    }

    // Quiet-ish frame: count down and keep tracking the echo level.
    // It rises faster than it falls, so short gaps between sentences
    // don't make the next sentence look like the caller talking.
    loudMs = Math.max(0, loudMs - intervalMs);
    echoLevel = level > echoLevel
      ? echoLevel * 0.9 + level * 0.1
      : echoLevel * 0.99 + level * 0.01;
  }, intervalMs);

  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
};