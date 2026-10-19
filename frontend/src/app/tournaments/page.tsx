"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Tournament = {
  id: string;
  name: string;
  type: "CUP";
  season: string | null;
  createdAt: string;
  createdBy?: {
    id: string;
    email: string;
  };
  teams?: Array<{
    team: {
      id: string;
      name: string;
      logoUrl: string | null;
    };
  }>;
  matches?: Array<{
    id: string;
    homeTeamId: string;
    awayTeamId: string;
    matchDate: string;
    homeScore: number | null;
    awayScore: number | null;
    round: number | null;
    homeTeam: {
      id: string;
      name: string;
    };
    awayTeam: {
      id: string;
      name: string;
    };
  }>;
};

type Team = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createSeason, setCreateSeason] = useState("");

  const [teamName, setTeamName] = useState("");
  const [teamLogoUrl, setTeamLogoUrl] = useState("");

  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [matchHomeTeamId, setMatchHomeTeamId] = useState("");
  const [matchAwayTeamId, setMatchAwayTeamId] = useState("");
  const [matchDate, setMatchDate] = useState("");

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("jaimelefoot_user");
    const storedToken = localStorage.getItem("jaimelefoot_token");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserEmail(parsed.email);
      } catch (e) {
        console.error("Impossible de parser l'utilisateur", e);
      }
    }
    if (storedToken) setToken(storedToken);
  }, []);

  async function loadTournaments() {
    setLoading(true);
    setError(null);
    try {
      // Charger uniquement les tournois (CUP)
      const allData = await apiFetch<Tournament[]>("/tournaments");
      const cupTournaments = allData.filter((t) => t.type === "CUP");
      setTournaments(cupTournaments);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les tournois");
    } finally {
      setLoading(false);
    }
  }

  async function loadTournamentDetails(id: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Tournament>(`/tournaments/${id}`);
      setSelectedTournament(data);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les détails du tournoi");
    } finally {
      setLoading(false);
    }
  }

  async function loadTeams() {
    try {
      const data = await apiFetch<Team[]>("/tournaments/teams/all");
      setTeams(data);
    } catch (err: any) {
      console.error("Erreur chargement équipes", err);
    }
  }

  useEffect(() => {
    loadTournaments();
    loadTeams();
  }, []);

  async function handleCreateTournament(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Tu dois être connecté pour créer un tournoi.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch<Tournament>(
        "/tournaments",
        {
          method: "POST",
          body: JSON.stringify({
            name: createName,
            type: "CUP",
            season: createSeason || null,
          }),
        },
        token
      );
      setCreateName("");
      setCreateSeason("");
      await loadTournaments();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du tournoi");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Tu dois être connecté pour créer une équipe.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch<Team>(
        "/tournaments/teams",
        {
          method: "POST",
          body: JSON.stringify({
            name: teamName,
            logoUrl: teamLogoUrl || null,
          }),
        },
        token
      );
      setTeamName("");
      setTeamLogoUrl("");
      await loadTeams();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de l'équipe");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTeamToTournament(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedTournament) {
      setError("Tu dois être connecté et sélectionner un tournoi.");
      return;
    }
    if (!selectedTeamId) {
      setError("Sélectionne une équipe.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch(
        `/tournaments/${selectedTournament.id}/teams`,
        {
          method: "POST",
          body: JSON.stringify({ teamId: selectedTeamId }),
        },
        token
      );
      setSelectedTeamId("");
      await loadTournamentDetails(selectedTournament.id);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'ajout de l'équipe");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMatch(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedTournament) {
      setError("Tu dois être connecté et sélectionner un tournoi.");
      return;
    }
    if (!matchHomeTeamId || !matchAwayTeamId || !matchDate) {
      setError("Remplis tous les champs du match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch(
        `/tournaments/${selectedTournament.id}/matches`,
        {
          method: "POST",
          body: JSON.stringify({
            homeTeamId: matchHomeTeamId,
            awayTeamId: matchAwayTeamId,
            matchDate,
          }),
        },
        token
      );
      setMatchHomeTeamId("");
      setMatchAwayTeamId("");
      setMatchDate("");
      await loadTournamentDetails(selectedTournament.id);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du match");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateMatchResult(matchId: string, homeScore: number, awayScore: number) {
    if (!token) {
      setError("Tu dois être connecté.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch(
        `/tournaments/matches/${matchId}/result`,
        {
          method: "PUT",
          body: JSON.stringify({ homeScore, awayScore }),
        },
        token
      );
      if (selectedTournament) {
        await loadTournamentDetails(selectedTournament.id);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour du résultat");
    } finally {
      setLoading(false);
    }
  }


  return (
    <section style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
      <h1>Tournois</h1>
      <p style={{ fontSize: "0.95rem", opacity: 0.8, marginBottom: "1.5rem" }}>
        Compétitions sur 1 jour : matchs de poule puis élimination directe
      </p>
      <div>
        <h1>Tournois & Championnats</h1>
        <p style={{ fontSize: "0.95rem", opacity: 0.85 }}>
          Crée et gère tes tournois, ajoute des équipes, programme les matchs et enregistre les résultats.
        </p>
      </div>

      {token && (
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: "1rem",
            background: "#f7f8fb",
          }}
        >
          <h2>Créer un tournoi</h2>
          <p style={{ fontSize: "0.9rem", opacity: 0.8, marginBottom: "0.75rem" }}>
            {token ? `Connecté en tant que ${userEmail}` : "Connecte-toi pour créer un tournoi"}
          </p>
          <form
            onSubmit={handleCreateTournament}
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 600 }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span>Nom du tournoi *</span>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
                placeholder="Ex : Coupe de la ville 2025"
                style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
              />
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                <span>Type</span>
                <select
                  value="CUP"
                  disabled
                  style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc", opacity: 0.7 }}
                >
                  <option value="CUP">Coupe</option>
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                <span>Saison</span>
                <input
                  value={createSeason}
                  onChange={(e) => setCreateSeason(e.target.value)}
                  placeholder="2024-2025"
                  style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
                />
              </label>
            </div>
            {error && <p style={{ color: "red", fontSize: "0.9rem" }}>{error}</p>}
            <button
              type="submit"
              disabled={loading || !token}
              style={{
                alignSelf: "flex-start",
                padding: "0.6rem 1rem",
                borderRadius: 6,
                border: "none",
                backgroundColor: token ? "#1e90ff" : "#94a3b8",
                color: "#fff",
                cursor: token ? "pointer" : "not-allowed",
              }}
            >
              {loading ? "Création..." : "Créer le tournoi"}
            </button>
          </form>
        </div>
      )}

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          padding: "1rem",
          background: "#f7f8fb",
        }}
      >
        <h2>Créer une équipe</h2>
        <form
          onSubmit={handleCreateTeam}
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 500 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span>Nom de l&apos;équipe *</span>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              placeholder="Ex : FC Local"
              style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span>URL du logo (optionnel)</span>
            <input
              value={teamLogoUrl}
              onChange={(e) => setTeamLogoUrl(e.target.value)}
              placeholder="https://..."
              style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
            />
          </label>
          <button
            type="submit"
            disabled={loading || !token}
            style={{
              alignSelf: "flex-start",
              padding: "0.6rem 1rem",
              borderRadius: 6,
              border: "none",
              backgroundColor: token ? "#16a34a" : "#94a3b8",
              color: "#fff",
              cursor: token ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Création..." : "Créer l&apos;équipe"}
          </button>
        </form>
      </div>

      <div>
        <h2>Liste des tournois</h2>
        {loading && tournaments.length === 0 && <p>Chargement...</p>}
        {error && tournaments.length === 0 && (
          <p style={{ color: "red", fontSize: "0.9rem" }}>{error}</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
          {tournaments.map((t) => (
            <article
              key={t.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: "0.75rem 1rem",
                background: "#fff",
                cursor: "pointer",
                outline: selectedTournament?.id === t.id ? "2px solid #1e90ff" : "none",
              }}
              onClick={() => loadTournamentDetails(t.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>{t.name}</h3>
                <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                  {t.type === "CUP" ? "Coupe" : "Championnat"}
                </span>
              </div>
              {t.season && (
                <p style={{ fontSize: "0.85rem", opacity: 0.75, margin: "0.3rem 0" }}>
                  Saison {t.season}
                </p>
              )}
              <p style={{ fontSize: "0.85rem", opacity: 0.65, margin: 0 }}>
                Créé le {new Date(t.createdAt).toLocaleDateString()}
              </p>
            </article>
          ))}
          {tournaments.length === 0 && !loading && <p>Aucun tournoi pour le moment.</p>}
        </div>
      </div>

      {selectedTournament && (
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: "1rem",
            background: "#f7f8fb",
          }}
        >
          <h2>Détails : {selectedTournament.name}</h2>

          <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
            <h3>Équipes participantes</h3>
            {selectedTournament.teams && selectedTournament.teams.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {selectedTournament.teams.map((tt) => (
                  <li
                    key={tt.team.id}
                    style={{
                      padding: "0.4rem 0.75rem",
                      background: "#fff",
                      borderRadius: 6,
                      border: "1px solid #ddd",
                    }}
                  >
                    {tt.team.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>Aucune équipe ajoutée</p>
            )}
          </div>

          {token && (
            <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
              <h3>Ajouter une équipe</h3>
              <form
                onSubmit={handleAddTeamToTournament}
                style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 400 }}
              >
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  required
                  style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
                >
                  <option value="">Choisir une équipe</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    alignSelf: "flex-start",
                    padding: "0.5rem 0.9rem",
                    borderRadius: 6,
                    border: "none",
                    backgroundColor: "#16a34a",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Ajouter
                </button>
              </form>
            </div>
          )}


          <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
            <h3>Matchs</h3>
            {selectedTournament.matches && selectedTournament.matches.length > 0 ? (
              (() => {
                // Grouper les matchs par journée
                const matchesByRound: { [key: number]: typeof selectedTournament.matches } = {};
                selectedTournament.matches.forEach((match) => {
                  const round = match.round || 0;
                  if (!matchesByRound[round]) {
                    matchesByRound[round] = [];
                  }
                  matchesByRound[round].push(match);
                });

                const rounds = Object.keys(matchesByRound)
                  .map(Number)
                  .sort((a, b) => a - b);

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {rounds.map((round) => (
                      <div key={round} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem", background: "#fff" }}>
                        <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "1.1rem", color: "#1e90ff" }}>
                          {round > 0 ? `Journée ${round}` : "Matchs sans journée"}
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          {matchesByRound[round]?.map((match) => (
                            <div
                              key={match.id}
                              style={{
                                padding: "0.75rem",
                                background: "#f7f8fb",
                                borderRadius: 6,
                                border: "1px solid #eee",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>{match.homeTeam.name}</span>
                                    {match.homeScore !== null && match.awayScore !== null ? (
                                      <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                                        {match.homeScore} - {match.awayScore}
                                      </span>
                                    ) : (
                                      <span style={{ opacity: 0.6 }}>vs</span>
                                    )}
                                    <span>{match.awayTeam.name}</span>
                                  </div>
                                  <p style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: "0.3rem" }}>
                                    {new Date(match.matchDate).toLocaleString()}
                                  </p>
                                </div>
                                {token && match.homeScore === null && match.awayScore === null && (
                                  <div style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem" }}>
                                    <input
                                      type="number"
                                      placeholder="Score"
                                      min={0}
                                      style={{
                                        width: 50,
                                        padding: "0.3rem",
                                        borderRadius: 4,
                                        border: "1px solid #ccc",
                                      }}
                                      id={`home-${match.id}`}
                                    />
                                    <span>-</span>
                                    <input
                                      type="number"
                                      placeholder="Score"
                                      min={0}
                                      style={{
                                        width: 50,
                                        padding: "0.3rem",
                                        borderRadius: 4,
                                        border: "1px solid #ccc",
                                      }}
                                      id={`away-${match.id}`}
                                    />
                                    <button
                                      onClick={() => {
                                        const homeInput = document.getElementById(`home-${match.id}`) as HTMLInputElement;
                                        const awayInput = document.getElementById(`away-${match.id}`) as HTMLInputElement;
                                        const homeScore = parseInt(homeInput.value, 10);
                                        const awayScore = parseInt(awayInput.value, 10);
                                        if (!isNaN(homeScore) && !isNaN(awayScore)) {
                                          handleUpdateMatchResult(match.id, homeScore, awayScore);
                                        }
                                      }}
                                      style={{
                                        padding: "0.3rem 0.6rem",
                                        borderRadius: 4,
                                        border: "none",
                                        backgroundColor: "#1e90ff",
                                        color: "#fff",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Enregistrer
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : (
              <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>Aucun match programmé</p>
            )}
          </div>

          {token && (
            <div style={{ marginTop: "1rem" }}>
              <h3>Créer un match</h3>
              <form
                onSubmit={handleCreateMatch}
                style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 500 }}
              >
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select
                    value={matchHomeTeamId}
                    onChange={(e) => setMatchHomeTeamId(e.target.value)}
                    required
                    style={{ flex: 1, padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
                  >
                    <option value="">Équipe domicile</option>
                    {selectedTournament.teams?.map((tt) => (
                      <option key={tt.team.id} value={tt.team.id}>
                        {tt.team.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={matchAwayTeamId}
                    onChange={(e) => setMatchAwayTeamId(e.target.value)}
                    required
                    style={{ flex: 1, padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
                  >
                    <option value="">Équipe extérieure</option>
                    {selectedTournament.teams?.map((tt) => (
                      <option key={tt.team.id} value={tt.team.id}>
                        {tt.team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="datetime-local"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    required
                    style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    alignSelf: "flex-start",
                    padding: "0.5rem 0.9rem",
                    borderRadius: 6,
                    border: "none",
                    backgroundColor: "#1e90ff",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Création..." : "Créer le match"}
                </button>
              </form>
            </div>
          )}

        </div>
      )}
    </section>
  );
}

