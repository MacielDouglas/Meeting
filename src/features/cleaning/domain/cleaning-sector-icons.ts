import type { ComponentType } from "react";
import { FaChair, FaDoorOpen, FaToilet, FaToiletPaper, FaTrashAlt } from "react-icons/fa";
import {
  GiBrickWall,
  GiBroom,
  GiGrass,
  GiSpiderWeb,
  GiSpikedFence,
  GiWindow,
} from "react-icons/gi";
import { IoWalkSharp } from "react-icons/io5";
import {
  MdLocalLaundryService,
  MdOutlineCleaningServices,
  MdTableBar,
  MdUmbrella,
} from "react-icons/md";
import { PiFanLight, PiMicrophoneStageFill } from "react-icons/pi";

export type SectorIconMap = Record<string, ComponentType<{ size?: number; className?: string }>>;

export const SECTOR_ICONS: SectorIconMap = {
  "per_meeting:auditorio": GiBroom,
  "per_meeting:banheiro_masculino": FaToilet,
  "per_meeting:banheiro_feminino": FaToilet,
  "per_meeting:abastecimento": FaToiletPaper,
  "per_meeting:recolher_lixo": FaTrashAlt,
  "weekly:teia_de_aranha": GiSpiderWeb,
  "weekly:auditorio": GiBroom,
  "weekly:portas_e_janelas": FaDoorOpen,
  "weekly:moveis": MdTableBar,
  "weekly:microfones": PiMicrophoneStageFill,
  "weekly:cadeiras": FaChair,
  "weekly:calcadas": IoWalkSharp,
  "weekly:lavanderia": MdLocalLaundryService,
  "weekly:objetos": MdUmbrella,
  "general:paredes": GiBrickWall,
  "general:janelas": GiWindow,
  "general:ventiladores": PiFanLight,
  "general:banheiros": FaToilet,
  "general:grades": GiSpikedFence,
  "general:jardim": GiGrass,
  "general:calcadas": IoWalkSharp,
  "general:sala_de_limpeza": MdOutlineCleaningServices,
};

export function getSectorIcon(
  typeKey: string,
  sectorKey: string,
): ComponentType<{ size?: number; className?: string }> {
  return SECTOR_ICONS[`${typeKey}:${sectorKey}`] ?? GiBroom;
}
