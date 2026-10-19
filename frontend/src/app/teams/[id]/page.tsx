"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Team = {
  id: string;
  name: string;
  logoUrl: string | null;
  createdAt: string;
  members: Array<{
    id: string;
    joinedAt: string;
    playerProfile: {
      id: string;
      firstName: string;
      lastName: string;
      position: string | null;
      user: {
        id: string;
        email: string;
        username: string | null;
      };
      cards: Array<{
        overallRating: number;
      }>;
    };
  }>;
  tournamentTeams: Array<{
    tournament: {
      id: string;
      name: string;
      type: string;
      season: string | null;
    };
  }>;
  _count: {
    members: number;
    homeMatches: number;
    awayMatches: number;
  };
};

type PlayerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  user: {
    id: string;
    email: string;
    username: string | null;
  };
};

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerProfile[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("jaimelefoot_token");
    const storedUser = localStorage.getItem("jaimelefoot_user");
    if (storedToken) setToken(storedToken);
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserId(user.id);
      } catch (e) {
        console.error("Erreur parsing user", e);
      }
    }
    if (teamId) {
      loadTeam();
    }
  }, [teamId]);

  async function loadTeam() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Team>(`/teams/${teamId}`);
      setTeam(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Impossible de charger l'équipe");
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailablePlayers() {
    try {
      const profiles = await apiFetch<PlayerProfile[]>("/players/all");
      // Filtrer les joueurs qui ne sont pas déjà dans l'équipe
      const memberIds = team?.members.map((m) => m.playerProfile.id) || [];
      setAvailablePlayers(profiles.filter((p) => !memberIds.includes(p.id)));
    } catch (err) {
      console.error("Erreur chargement joueurs", err);
    }
  }

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedPlayerId) {
      setError("Tu dois être connecté et sélectionner un joueur");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch(
        `/teams/${teamId}/members`,
        {
          method: "POST",
          body: JSON.stringify({ playerProfileId: selectedPlayerId }),
        },
        token
      );
      setShowAddMemberForm(false);
      setSelectedPlayerId("");
      loadTeam();
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Erreur lors de l'ajout du membre");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!token || !confirm("Êtes-vous sûr de vouloir retirer ce membre de l'équipe ?")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/teams/${teamId}/members/${memberId}`, { method: "DELETE" }, token);
      loadTeam();
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Erreur lors de la suppression du membre");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !team) {
    return (
      <section style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
        <p>Chargement...</p>
      </section>
    );
  }

  if (error && !team) {
    return (
      <section style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
        <h1>Erreur</h1>
        <p style={{ color: "red" }}>{error}</p>
        <button onClick={() => router.push("/teams")} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Retour aux équipes
        </button>
      </section>
    );
  }

  if (!team) return null;

  return (
    <section style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
      <button
        onClick={() => router.push("/teams")}
        style={{
          marginBottom: "1rem",
          padding: "0.5rem 1rem",
          borderRadius: 6,
          border: "1px solid #ccc",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        ← Retour aux équipes
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}>
        {team.logoUrl && (
          <img src={team.logoUrl} alt={team.name} style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover" }} />
        )}
        <div>
          <h1 style={{ margin: 0 }}>{team.name}</h1>
          <p style={{ margin: "0.5rem 0 0 0", opacity: 0.7 }}>
            Créée le {new Date(team.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: "0.75rem", background: "#fee", color: "#c33", borderRadius: 6, marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ padding: "1rem", background: "#f7f8fb", borderRadius: 8, border: "1px solid #eee" }}>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#1e90ff" }}>{team._count.members}</div>
          <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>Membres</div>
        </div>
        <div style={{ padding: "1rem", background: "#f7f8fb", borderRadius: 8, border: "1px solid #eee" }}>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#16a34a" }}>
            {team._count.homeMatches + team._count.awayMatches}
          </div>
          <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>Matchs</div>
        </div>
        <div style={{ padding: "1rem", background: "#f7f8fb", borderRadius: 8, border: "1px solid #eee" }}>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#9333ea" }}>{team.tournamentTeams.length}</div>
          <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>Tournois/Championnats</div>
        </div>
      </div>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          padding: "1rem",
          background: "#f7f8fb",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2>Membres</h2>
          {token && (
            <button
              onClick={() => {
                setShowAddMemberForm(!showAddMemberForm);
                if (!showAddMemberForm) {
                  loadAvailablePlayers();
                }
              }}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: 6,
                border: "none",
                backgroundColor: "#1e90ff",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {showAddMemberForm ? "Annuler" : "Ajouter un membre"}
            </button>
          )}
        </div>

        {showAddMemberForm && token && (
          <form
            onSubmit={handleAddMember}
            style={{
              padding: "1rem",
              background: "#fff",
              borderRadius: 6,
              marginBottom: "1rem",
              border: "1px solid #ddd",
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span>Joueur à ajouter</span>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                required
                style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
              >
                <option value="">Sélectionner un joueur...</option>
                {availablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.firstName} {player.lastName} {player.user.username ? `(@${player.user.username})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: 6,
                border: "none",
                backgroundColor: "#1e90ff",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {loading ? "Ajout..." : "Ajouter"}
            </button>
          </form>
        )}

        {team.members.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Aucun membre dans cette équipe.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {team.members.map((member) => (
              <div
                key={member.id}
                style={{
                  padding: "0.75rem",
                  background: "#fff",
                  borderRadius: 6,
                  border: "1px solid #ddd",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold" }}>
                    <a
                      href={member.playerProfile.user.username ? `/players/username/${member.playerProfile.user.username}` : `/players/${member.playerProfile.id}`}
                      style={{ color: "#1e90ff", textDecoration: "none" }}
                    >
                      {member.playerProfile.firstName} {member.playerProfile.lastName}
                    </a>
                  </div>
                  {member.playerProfile.user.username && (
                    <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>@{member.playerProfile.user.username}</div>
                  )}
                  {member.playerProfile.position && (
                    <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>{member.playerProfile.position}</div>
                  )}
                  {member.playerProfile.cards.length > 0 && (
                    <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                      ⭐ {member.playerProfile.cards[0].overallRating}
                    </div>
                  )}
                </div>
                {token && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: 4,
                      border: "none",
                      background: "#ef4444",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    Retirer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {team.tournamentTeams.length > 0 && (
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: "1rem",
            background: "#f7f8fb",
          }}
        >
          <h2>Tournois et Championnats</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }}>
            {team.tournamentTeams.map((tt) => (
              <div
                key={tt.tournament.id}
                style={{
                  padding: "0.75rem",
                  background: "#fff",
                  borderRadius: 6,
                  border: "1px solid #ddd",
                }}
              >
                <div style={{ fontWeight: "bold" }}>{tt.tournament.name}</div>
                <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                  {tt.tournament.type === "LEAGUE" ? "Championnat" : "Tournoi"}
                  {tt.tournament.season && ` • ${tt.tournament.season}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}


