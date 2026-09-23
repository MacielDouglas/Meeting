import type { IconType } from "react-icons";
import { AiOutlineSound } from "react-icons/ai";
import { FaLaptop } from "react-icons/fa";
import { FcPodiumWithSpeaker } from "react-icons/fc";
import { GiMicrophone } from "react-icons/gi";
import { MdEmojiPeople, MdMiscellaneousServices } from "react-icons/md";
import { cn } from "@/shared/lib/utils";

const DUTY_ICONS: Record<string, IconType> = {
  usher: MdEmojiPeople,
  microphone: GiMicrophone,
  sound: AiOutlineSound,
  video: FaLaptop,
  platform: FcPodiumWithSpeaker,
};

/** Cor por posto para ajudar a identificar (plataforma já é multicolorida). */
const DUTY_ICON_COLORS: Record<string, string> = {
  usher: "text-sky-600 dark:text-sky-400",
  microphone: "text-amber-600 dark:text-amber-400",
  sound: "text-violet-600 dark:text-violet-400",
  video: "text-rose-600 dark:text-rose-400",
  platform: "",
};

/** Ícone do posto da escala (setor personalizado usa o ícone genérico). */
export function DutyKeyIcon({ dutyKey, className }: { dutyKey: string; className?: string }) {
  const Icon = DUTY_ICONS[dutyKey] ?? MdMiscellaneousServices;
  return (
    <Icon
      aria-hidden
      size={18}
      className={cn("shrink-0", DUTY_ICON_COLORS[dutyKey] ?? "text-muted-foreground", className)}
    />
  );
}
