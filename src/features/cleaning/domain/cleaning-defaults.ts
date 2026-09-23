export type CleaningTypeKey = "per_meeting" | "weekly" | "general";
export type CleaningAssignmentMode = "person" | "family" | "group";
export type RequiredSex = "any" | "male" | "female";

export interface CleaningTypeDefault {
  key: CleaningTypeKey;
  label: string;
  description: string;
}

export interface CleaningSectorDefault {
  typeKey: CleaningTypeKey;
  key: string;
  name: string;
  task: string;
}

export const CLEANING_TYPES: CleaningTypeDefault[] = [
  {
    key: "per_meeting",
    label: "Limpieza en cada reunión",
    description: "Se hace al final de todas las reuniones.",
  },
  {
    key: "weekly",
    label: "Limpieza semanal",
    description: "Se hace 1 vez por semana en un día fijo.",
  },
  {
    key: "general",
    label: "Limpieza general",
    description: "Limpieza esporádica / general.",
  },
];

export const CLEANING_SECTORS_DEFAULTS: CleaningSectorDefault[] = [
  // ── A cada reunião ──
  {
    typeKey: "per_meeting",
    key: "auditorio",
    name: "Auditorio",
    task: "Barra o aspire el suelo. Pase un paño húmedo por el suelo o use la mopa, si es necesario. Para evitar accidentes, hágalo cuando haya pocas personas en el lugar.",
  },
  {
    typeKey: "per_meeting",
    key: "banheiro_masculino",
    name: "Baño hombres",
    task: "Limpie el inodoro, el urinario y la pared de alrededor con desinfectante. Recoja la basura. Pase un paño con desinfectante por el suelo. Limpie los espejos con un paño humedecido con agua y detergente. Limpie los lavabos y los grifos con un paño humedecido y detergente.",
  },
  {
    typeKey: "per_meeting",
    key: "banheiro_feminino",
    name: "Baño mujeres",
    task: "Limpie el inodoro y la pared de alrededor con desinfectante. Recoja la basura. Pase un paño con desinfectante por el suelo. Limpie los espejos con un paño humedecido con agua y detergente. Limpie los lavabos y los grifos con un paño humedecido y detergente.",
  },
  {
    typeKey: "per_meeting",
    key: "abastecimento",
    name: "Abastecimiento",
    task: "Reponga los dispensadores de papel higiénico, papel toalla, portavasos, jabón y alcohol en gel, si es necesario.",
  },
  {
    typeKey: "per_meeting",
    key: "recolher_lixo",
    name: "Recoger basura",
    task: "Recoja la basura.",
  },
  // ── Semanal ──
  {
    typeKey: "weekly",
    key: "teia_de_aranha",
    name: "Telarañas",
    task: "Retire las telarañas del techo y de las luminarias con un plumero de mango extensible.",
  },
  {
    typeKey: "weekly",
    key: "auditorio",
    name: "Auditorio",
    task: "Barra o aspire el suelo. Pase un paño húmedo por el suelo o use la mopa.",
  },
  {
    typeKey: "weekly",
    key: "portas_e_janelas",
    name: "Puertas y ventanas",
    task: "Limpie las puertas, ventanas, vidrios y vierteaguas con un paño ligeramente humedecido, si es necesario.",
  },
  {
    typeKey: "weekly",
    key: "moveis",
    name: "Muebles",
    task: "Limpie las manijas, la tribuna, la mesa del escenario, el bebedero, los interruptores, los mostradores y los dispensadores de alcohol en gel con un paño humedecido con agua y detergente.",
  },
  {
    typeKey: "weekly",
    key: "microfones",
    name: "Micrófonos",
    task: "Higienice los micrófonos y sus cables con un paño ligeramente humedecido en agua y detergente. Nunca use un paño empapado.",
  },
  {
    typeKey: "weekly",
    key: "cadeiras",
    name: "Sillas",
    task: "Limpie los brazos, asientos y respaldos de las sillas con un paño humedecido en agua y unas gotas de detergente.",
  },
  {
    typeKey: "weekly",
    key: "calcadas",
    name: "Aceras",
    task: "Barra las aceras. Recoja hojas y suciedad del estacionamiento, del área exterior y de los jardines.",
  },
  {
    typeKey: "weekly",
    key: "lavanderia",
    name: "Lavandería",
    task: "Lave los paños.",
  },
  {
    typeKey: "weekly",
    key: "objetos",
    name: "Objetos",
    task: "Retire los objetos personales dejados en el Salón del Reino.",
  },
  // ── Geral ──
  {
    typeKey: "general",
    key: "paredes",
    name: "Paredes",
    task: "Quite las manchas de las paredes internas y externas con una solución de agua y detergente neutro y una esponja suave.",
  },
  {
    typeKey: "general",
    key: "janelas",
    name: "Ventanas",
    task: "Limpie las persianas o cortinas.",
  },
  {
    typeKey: "general",
    key: "ventiladores",
    name: "Ventiladores",
    task: "Limpie los ventiladores.",
  },
  {
    typeKey: "general",
    key: "banheiros",
    name: "Baños",
    task: "Limpie los revestimientos de las paredes y las divisiones de los baños con paño humedecido y detergente. Limpie las divisiones cercanas al inodoro y al urinario con un paño humedecido y desinfectante.",
  },
  {
    typeKey: "general",
    key: "grades",
    name: "Rejas",
    task: "Limpie las rejas y el portón.",
  },
  {
    typeKey: "general",
    key: "jardim",
    name: "Jardín",
    task: "Corte el césped y quite las malas hierbas de los jardines y del estacionamiento. Pode las plantas ornamentales y los arbustos.",
  },
  {
    typeKey: "general",
    key: "calcadas",
    name: "Aceras",
    task: "Lave las aceras y otras áreas de concreto.",
  },
  {
    typeKey: "general",
    key: "sala_de_limpeza",
    name: "Sala de limpieza",
    task: "Organice la sala de limpieza y lave los cubos de basura.",
  },
];
