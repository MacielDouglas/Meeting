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
    label: "Limpeza a cada reunião",
    description: "Feita no final de todas as reuniões.",
  },
  {
    key: "weekly",
    label: "Limpeza Semanal",
    description: "Feita 1x por semana em dia fixo.",
  },
  {
    key: "general",
    label: "Limpeza Geral",
    description: "Limpeza esporádica / geral.",
  },
];

export const CLEANING_SECTORS_DEFAULTS: CleaningSectorDefault[] = [
  // ── A cada reunião ──
  {
    typeKey: "per_meeting",
    key: "auditorio",
    name: "Auditório",
    task: "Varra ou aspire o chão. Passe um pano umedecido no chão ou use o mop, se necessário. Para evitar acidentes, faça isso quando houver poucas pessoas no local.",
  },
  {
    typeKey: "per_meeting",
    key: "banheiro_masculino",
    name: "Banheiro Masculino",
    task: "Limpe o vaso sanitário, o mictório e a parede ao redor com desinfetante. Recolha o lixo. Passe um pano com desinfetante no chão. Limpe os espelhos com um pano umedecido com água e detergente. Limpe as pias e torneiras com um pano umedecido e detergente.",
  },
  {
    typeKey: "per_meeting",
    key: "banheiro_feminino",
    name: "Banheiro Feminino",
    task: "Limpe o vaso sanitário e a parede ao redor com desinfetante. Recolha o lixo. Passe um pano com desinfetante no chão. Limpe os espelhos com um pano umedecido com água e detergente. Limpe as pias e torneiras com um pano umedecido e detergente.",
  },
  {
    typeKey: "per_meeting",
    key: "abastecimento",
    name: "Abastecimento",
    task: "Abasteça os dispensers de papel higiênico, papel toalha, porta-copos, saboneteira e álcool em gel, se necessário.",
  },
  {
    typeKey: "per_meeting",
    key: "recolher_lixo",
    name: "Recolher Lixo",
    task: "Recolha o lixo.",
  },
  // ── Semanal ──
  {
    typeKey: "weekly",
    key: "teia_de_aranha",
    name: "Teia de aranha",
    task: "Retire as teias de aranha do teto e das luminárias com um espanador de cabo extensível.",
  },
  {
    typeKey: "weekly",
    key: "auditorio",
    name: "Auditório",
    task: "Varra ou aspire o chão. Passe um pano umedecido no chão ou use o mop.",
  },
  {
    typeKey: "weekly",
    key: "portas_e_janelas",
    name: "Portas e Janelas",
    task: "Limpe as portas, janelas, vidros e pingadeiras com um pano levemente umedecido, se necessário.",
  },
  {
    typeKey: "weekly",
    key: "moveis",
    name: "Móveis",
    task: "Limpe as maçanetas, a tribuna, a mesa do palco, o bebedouro, os interruptores, os balcões e os dispensers de álcool gel usando um pano umedecido com água e detergente.",
  },
  {
    typeKey: "weekly",
    key: "microfones",
    name: "Microfones",
    task: "Higienize os microfones e seus cabos com um pano levemente umedecido em água e detergente. Nunca use um pano encharcado.",
  },
  {
    typeKey: "weekly",
    key: "cadeiras",
    name: "Cadeiras",
    task: "Limpe os braços, assentos e encostos das cadeiras com um pano umedecido em água e algumas gotas de detergente.",
  },
  {
    typeKey: "weekly",
    key: "calcadas",
    name: "Calçadas",
    task: "Varra as calçadas. Recolha folhas e sujeira do estacionamento, área externa e jardins.",
  },
  {
    typeKey: "weekly",
    key: "lavanderia",
    name: "Lavanderia",
    task: "Lave os panos.",
  },
  {
    typeKey: "weekly",
    key: "objetos",
    name: "Objetos",
    task: "Retire objetos pessoais deixados no Salão do Reino.",
  },
  // ── Geral ──
  {
    typeKey: "general",
    key: "paredes",
    name: "Paredes",
    task: "Remova manchas das paredes internas e externas usando uma solução de água e detergente neutro e uma esponja macia.",
  },
  {
    typeKey: "general",
    key: "janelas",
    name: "Janelas",
    task: "Limpe as persianas ou cortinas.",
  },
  {
    typeKey: "general",
    key: "ventiladores",
    name: "Ventiladores",
    task: "Limpe os ventiladores.",
  },
  {
    typeKey: "general",
    key: "banheiros",
    name: "Banheiros",
    task: "Limpe os revestimentos das paredes e divisórias dos banheiros com pano umedecido e detergente. Limpe as divisórias próximas ao vaso sanitário e mictório com um pano umedecido e desinfetante.",
  },
  {
    typeKey: "general",
    key: "grades",
    name: "Grades",
    task: "Limpe as grades e o portão.",
  },
  {
    typeKey: "general",
    key: "jardim",
    name: "Jardim",
    task: "Corte a grama e remova ervas daninhas dos jardins e do estacionamento. Faça a poda das plantas ornamentais e arbustos.",
  },
  {
    typeKey: "general",
    key: "calcadas",
    name: "Calçadas",
    task: "Lave as calçadas e outras áreas concretadas.",
  },
  {
    typeKey: "general",
    key: "sala_de_limpeza",
    name: "Sala de Limpeza",
    task: "Organize a sala de limpeza e lave as lixeiras.",
  },
];
