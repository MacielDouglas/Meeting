// Setores padrão de designações (valem para todas as reuniões).
// key mapeia para a habilidade (flag) correspondente no cadastro de Pessoas.
export interface DesignationSectorDefault {
  key: string;
  name: string;
  personFlag: "usher" | "sound" | "video" | "microphone" | "platform" | null;
  defaultPeopleCount: number | null;
  defaultSlots: string[];
}

export const DESIGNATION_SECTORS_DEFAULTS: DesignationSectorDefault[] = [
  {
    key: "acomodadores",
    name: "Acomodadores",
    personFlag: "usher",
    defaultPeopleCount: 2,
    defaultSlots: ["Sector A", "Sector B"],
  },
  {
    key: "som",
    name: "Sonido",
    personFlag: "sound",
    defaultPeopleCount: 1,
    defaultSlots: [],
  },
  {
    key: "video",
    name: "Video",
    personFlag: "video",
    defaultPeopleCount: 1,
    defaultSlots: [],
  },
  {
    key: "microfone",
    name: "Micrófono",
    personFlag: "microphone",
    defaultPeopleCount: 2,
    defaultSlots: ["Micrófono A", "Micrófono B"],
  },
  {
    key: "plataforma",
    name: "Plataforma",
    personFlag: "platform",
    defaultPeopleCount: 1,
    defaultSlots: [],
  },
];
