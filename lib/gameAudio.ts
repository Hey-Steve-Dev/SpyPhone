import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";

const messageSource = require("@/assets/sfx/message-vibe.wav");

type AudioPlayerLike = ReturnType<typeof createAudioPlayer>;

let messagePlayer: AudioPlayerLike | null = null;
let initialized = false;
let soundEnabled = false;

function canUseAudio() {
  return typeof window !== "undefined";
}

export function setGameSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function getGameSoundEnabled() {
  return soundEnabled;
}

export async function initGameAudio() {
  if (initialized) return;
  if (!canUseAudio()) return;

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });

    messagePlayer = createAudioPlayer(messageSource);
    messagePlayer.volume = 1;
    initialized = true;
  } catch (error) {
    console.warn("initGameAudio failed:", error);
  }
}

export async function playIncomingMessageFx() {
  if (!canUseAudio()) return;
  if (!soundEnabled) return;

  try {
    await initGameAudio();

    if (!messagePlayer) return;

    if (messagePlayer.playing) {
      messagePlayer.pause();
    }

    messagePlayer.seekTo(0);
    messagePlayer.play();
  } catch (error) {
    console.warn("playIncomingMessageFx audio failed:", error);
  }

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.warn("playIncomingMessageFx haptics failed:", error);
  }
}
