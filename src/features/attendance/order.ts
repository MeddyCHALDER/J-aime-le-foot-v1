import type { Attendance } from './api';

/** Heure du « Je viens » (in_at, migration 012), sinon dernière réponse. */
function arrivedAt(r: Attendance) {
  return new Date(r.in_at ?? r.updated_at ?? 0).getTime();
}

/**
 * Titulaires et liste d'attente, dans l'ordre d'arrivée des « Je viens ».
 * Les maxPlayers premiers jouent ; les suivants attendent et montent dès qu'une place se libère.
 */
export function splitByArrival(rows: Attendance[], maxPlayers: number | null | undefined) {
  const going = rows
    .filter((r) => r.status === 'in')
    .sort((a, b) => arrivedAt(a) - arrivedAt(b) || a.user_id.localeCompare(b.user_id));
  const limit = maxPlayers && maxPlayers > 0 ? maxPlayers : Infinity;
  const confirmed = going.slice(0, limit);
  const waitlist = Number.isFinite(limit) ? going.slice(limit) : [];

  /** Rang d'un joueur : { list: 'confirmed', n: 4 } ou { list: 'waitlist', n: 2 } */
  const rankOf = (userId: string | undefined) => {
    if (!userId) return null;
    const c = confirmed.findIndex((r) => r.user_id === userId);
    if (c >= 0) return { list: 'confirmed' as const, n: c + 1 };
    const w = waitlist.findIndex((r) => r.user_id === userId);
    if (w >= 0) return { list: 'waitlist' as const, n: w + 1 };
    return null;
  };

  return {
    going,
    confirmed,
    waitlist,
    full: Number.isFinite(limit) && going.length >= limit,
    limit: Number.isFinite(limit) ? limit : null,
    rankOf,
  };
}

/** « 1er », « 2e », « 3e »… */
export function ordinal(n: number) {
  return n === 1 ? '1er' : `${n}e`;
}
