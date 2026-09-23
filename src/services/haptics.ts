import { Haptics, ImpactStyle } from "@capacitor/haptics";

export const triggerHaptic = async (enabled: boolean) => {
  if (!enabled) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    if ("vibrate" in navigator) navigator.vibrate(12);
  }
};
