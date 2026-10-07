let audioContext: AudioContext | null = null;

export function playNotificationSound(): void {
  if (typeof window === "undefined" || !("AudioContext" in window)) return;

  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
    const start = audioContext.currentTime;
    for (const [index, frequency] of [740, 988].entries()) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const at = start + index * 0.12;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.11, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.21);
    }
  } catch (error) {
    console.error("Could not play the notification sound:", error);
  }
}
