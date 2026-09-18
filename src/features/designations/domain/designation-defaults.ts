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
    defaultSlots: ["Setor A", "Setor B"],
  },
  {
    key: "som",
    name: "Som",
    personFlag: "sound",
    defaultPeopleCount: 1,
    defaultSlots: [],
  },
  {
    key: "video",
    name: "Vídeo",
    personFlag: "video",
    defaultPeopleCount: 1,
    defaultSlots: [],
  },
  {
    key: "microfone",
    name: "Microfone",
    personFlag: "microphone",
    defaultPeopleCount: 2,
    defaultSlots: ["Microfone A", "Microfone B"],
  },
  {
    key: "plataforma",
    name: "Plataforma",
    personFlag: "platform",
    defaultPeopleCount: 1,
    defaultSlots: [],
  },
];
