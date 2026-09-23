import type { IconType } from "react-icons";
import { AiOutlineSound } from "react-icons/ai";
import { FaLaptop } from "react-icons/fa";
import { FcPodiumWithSpeaker } from "react-icons/fc";
import { GiMicrophone } from "react-icons/gi";
import { MdEmojiPeople, MdMiscellaneousServices } from "react-icons/md";

const DUTY_ICONS: Record<string, IconType> = {
  usher: MdEmojiPeople,
  microphone: GiMicrophone,
  sound: AiOutlineSound,
  video: FaLaptop,
  platform: FcPodiumWithSpeaker,
};

/** Ícone do posto da escala (setor personalizado usa o ícone genérico). */
export function DutyKeyIcon({ dutyKey }: { dutyKey: string }) {
  const Icon = DUTY_ICONS[dutyKey] ?? MdMiscellaneousServices;
  return <Icon aria-hidden size={18} className="shrink-0 text-muted-foreground" />;
}
