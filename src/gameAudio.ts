let context: AudioContext | undefined;
export function playGameTone(kind: "success" | "wrong" | "win" | "start") {
  try {
    context ||= new AudioContext();
    void context.resume();
    const notes =
      kind === "win"
        ? [523, 659, 784, 1047]
        : kind === "success"
          ? [660, 880]
          : kind === "wrong"
            ? [180, 130]
            : [330, 440, 660];
    notes.forEach((frequency, i) => {
      const oscillator = context!.createOscillator(),
        gain = context!.createGain();
      const start = context!.currentTime + i * 0.09;
      oscillator.type = kind === "wrong" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.045, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      oscillator.connect(gain);
      gain.connect(context!.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.18);
    });
  } catch {
    /* Audio is optional; gameplay remains available. */
  }
}
