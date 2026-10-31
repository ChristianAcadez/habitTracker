interface EncouragementInput {
  streak: number;          // racha total en días
  completionRate: number;  // % de cumplimiento del mes (0-100)
  hasHabits: boolean;
  today: string;           // 'YYYY-MM-DD', para rotar la variante cada día
}

function pick(variants: string[], seed: number): string {
  return variants[seed % variants.length];
}

export function getEncouragement({
  streak,
  completionRate,
  hasHabits,
  today,
}: EncouragementInput): string {
  const seed = Number(today.replace(/-/g, ''));

  if (!hasHabits) return 'Agrega tu primer hábito para empezar.';

  if (streak >= 30) {
    return pick([`${streak} días seguidos. Esto ya es parte de ti.`, 'Un mes o más de constancia. Eso no es suerte.'], seed);
  }
  if (streak >= 14) {
    return pick([`${streak} días sin fallar. Vas muy bien.`, 'Dos semanas de constancia. No la sueltes.'], seed);
  }
  if (streak >= 7) {
    return pick(['¡Una semana completa! Mantén el ritmo.', `${streak} días seguidos. Ya tienes impulso.`], seed);
  }
  if (streak >= 3) {
    return pick([`${streak} días seguidos. ¡No lo sueltes!`, 'Estás agarrando ritmo. Sigue así.'], seed);
  }

  if (completionRate >= 90) {
    return pick(['Mes casi perfecto. ¡Sigue así!', 'Estás cumpliendo casi todo este mes.'], seed);
  }
  if (completionRate >= 70) {
    return pick(['Buen mes, vas por buen camino.', 'Cumples la mayoría de tus hábitos. ¡Bien!'], seed);
  }
  if (completionRate >= 40) {
    return pick(['Aún puedes subir el porcentaje este mes.', 'Cada hábito de hoy suma al mes.'], seed);
  }
  if (completionRate > 0) {
    return pick(['Cada día cuenta. Retoma hoy.', 'Un hábito hoy ya cambia el mes.'], seed);
  }

  return pick(['Hoy es un buen día para empezar.', 'Empieza con un solo hábito hoy.'], seed);
}