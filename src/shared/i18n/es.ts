export const es = {
  appName: "Reuniones",
  appDescription: "Programa semanal de reuniones",
  currentWeek: "Semana actual",
  midweekMeeting: "Reunión entre semana",
  weekendMeeting: "Reunión de fin de semana",
  midweekBadge: "Entre semana",
  weekendBadge: "Fin de semana",
  noProgramYet: "Programa disponible próximamente.",
  noAssignments: "Aún no hay designaciones para esta reunión.",
  signInWithGoogle: "Iniciar sesión con Google",
  signInTitle: "Iniciar sesión",
  signInDescription: "Usa tu cuenta de Google para ver el programa.",
  backToHome: "Volver al inicio",
  offlineMessage: "Sin conexión. Mostrando la última información guardada.",
  onlineMessage: "En línea",
  offlineTitle: "Sin conexión",
  offlineDescription: "Revisa tu conexión para ver el programa actualizado.",
  weekLabel: "Semana",
} as const;

export type SpanishDictionary = typeof es;
