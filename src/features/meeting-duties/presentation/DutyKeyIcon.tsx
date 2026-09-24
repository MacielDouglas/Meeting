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

const DUTY_ICON_COLORS: Record<string, string> = {
  usher: "text-muted-foreground",
  microphone: "text-muted-foreground",
  sound: "text-muted-foreground",
  video: "text-muted-foreground",
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
