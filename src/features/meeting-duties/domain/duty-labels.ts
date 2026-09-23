/** Rótulos em espanhol (singular) para os postos conhecidos; resto usa o nome da config. */
const DUTY_LABELS_ES: Record<string, string> = {
  usher: "Acomodador",
  microphone: "Micrófono",
  sound: "Sonido",
  video: "Video",
  platform: "Plataforma",
};

export function dutyLabel(dutyKey: string, fallback: string): string {
  return DUTY_LABELS_ES[dutyKey] ?? fallback;
}
