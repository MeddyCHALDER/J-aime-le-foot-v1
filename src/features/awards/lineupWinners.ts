/** Voix d'un joueur à un poste de l'équipe type. */
export interface LineupVoteRow {
  slot: string;
  player_id: string;
  votes: number;
}

export interface LineupWinner {
  player_id: string;
  votes: number;
  /** Égalité que l'admin n'a pas encore tranchée : joueur affiché provisoirement. */
  tied?: boolean;
}

export interface LineupTie {
  slot: string;
  votes: number;
  /** Joueurs à égalité pour ce poste (au moins deux). */
  options: string[];
}

/**
 * Équipe gagnante : on remplit les postes du plus grand nombre de voix au plus petit,
 * un joueur ne gagnant qu'un poste. Quand plusieurs joueurs ont autant de voix pour
 * un même poste, c'est le choix de l'admin (`picks`) qui compte ; sans choix, le premier
 * est affiché provisoirement et l'égalité est renvoyée dans `ties`.
 *
 * `slotOrder` : clés des postes dans l'ordre de la formation (sert aussi de filtre).
 */
export function computeLineupWinners(
  rows: LineupVoteRow[],
  slotOrder: string[],
  picks: Record<string, string> = {}
): { winners: Record<string, LineupWinner>; ties: LineupTie[] } {
  const rank = new Map(slotOrder.map((k, i) => [k, i]));
  const winners: Record<string, LineupWinner> = {};
  const ties: LineupTie[] = [];
  const used = new Set<string>();
  const valid = rows.filter((r) => rank.has(r.slot) && r.votes > 0);

  for (;;) {
    const open = valid.filter((r) => !winners[r.slot] && !used.has(r.player_id));
    if (open.length === 0) break;
    const top = Math.max(...open.map((r) => r.votes));
    const level = open.filter((r) => r.votes === top);

    const perSlot = new Map<string, LineupVoteRow[]>();
    const perPlayer = new Map<string, number>();
    for (const r of level) {
      perSlot.set(r.slot, [...(perSlot.get(r.slot) ?? []), r]);
      perPlayer.set(r.player_id, (perPlayer.get(r.player_id) ?? 0) + 1);
    }
    const slotsInOrder = [...perSlot.keys()].sort((a, b) => rank.get(a)! - rank.get(b)!);

    // 1. Un seul joueur pour ce poste, et ce joueur n'est en tête nulle part ailleurs
    const clear = slotsInOrder.find((s) => {
      const c = perSlot.get(s)!;
      return c.length === 1 && perPlayer.get(c[0].player_id) === 1;
    });
    if (clear) {
      assign(clear, perSlot.get(clear)![0]);
      continue;
    }

    // 2. Un poste avec un seul candidat (qui est aussi en tête d'un autre poste) :
    //    on le place au premier poste de la formation, sans égalité de joueurs à trancher
    const single = slotsInOrder.find((s) => perSlot.get(s)!.length === 1);
    if (single) {
      assign(single, perSlot.get(single)![0]);
      continue;
    }

    // 3. Plusieurs joueurs à égalité pour un poste : choix de l'admin, sinon provisoire
    const slot = slotsInOrder[0];
    const candidates = perSlot.get(slot)!;
    const picked = candidates.find((c) => c.player_id === picks[slot]);
    if (picked) {
      assign(slot, picked);
    } else {
      ties.push({ slot, votes: top, options: candidates.map((c) => c.player_id) });
      assign(slot, candidates[0], true);
    }
  }

  ties.sort((a, b) => rank.get(a.slot)! - rank.get(b.slot)!);
  return { winners, ties };

  function assign(slot: string, r: LineupVoteRow, tied = false) {
    winners[slot] = tied ? { player_id: r.player_id, votes: r.votes, tied } : { player_id: r.player_id, votes: r.votes };
    used.add(r.player_id);
  }
}
