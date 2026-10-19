"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Team = {
  id: string;
  name: string;
  logoUrl: string | null;
  createdAt: string;
  members?: Array<{
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
    };
  }>;
  _count?: {
    members: number;
  };
};

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState("");

  const [createForm, setCreateForm] = useState({
    name: "",
    logoUrl: "",
  });

  useEffect(() => {
    const storedToken = localStorage.getItem("jaimelefoot_token");
    if (storedToken) setToken(storedToken);
    loadTeams();
  }, [search]);

  async function loadTeams() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const data = await apiFetch<Team[]>(`/teams?${params.toString()}`);
      setTeams(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Impossible de charger les équipes");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Tu dois être connecté pour créer une équipe");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const team = await apiFetch<Team>(
        "/teams",
        {
          method: "POST",
          body: JSON.stringify({
            name: createForm.name.trim(),
            logoUrl: createForm.logoUrl.trim() || null,
          }),
        },
        token
      );
      setShowCreateForm(false);
      setCreateForm({ name: "", logoUrl: "" });
      loadTeams();
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Erreur lors de la création de l'équipe");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1>Équipes</h1>
        {token && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: 6,
              border: "none",
              backgroundColor: "#1e90ff",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {showCreateForm ? "Annuler" : "Créer une équipe"}
          </button>
        )}
      </div>

      {showCreateForm && token && (
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: "1rem",
            marginBottom: "1.5rem",
            background: "#f7f8fb",
          }}
        >
          <h2>Créer une équipe</h2>
          <form onSubmit={handleCreateTeam} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 500 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span>Nom de l'équipe *</span>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
                style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span>URL du logo (optionnel)</span>
              <input
                type="url"
                value={createForm.logoUrl}
                onChange={(e) => setCreateForm({ ...createForm, logoUrl: e.target.value })}
                style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              style={{
                alignSelf: "flex-start",
                padding: "0.5rem 1rem",
                borderRadius: 6,
                border: "none",
                backgroundColor: "#1e90ff",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {loading ? "Création..." : "Créer l'équipe"}
            </button>
          </form>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Rechercher une équipe..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "0.6rem",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
      </div>

      {error && (
        <div style={{ padding: "0.75rem", background: "#fee", color: "#c33", borderRadius: 6, marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {loading && !teams.length ? (
        <p>Chargement...</p>
      ) : teams.length === 0 ? (
        <p style={{ opacity: 0.7 }}>Aucune équipe trouvée.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {teams.map((team) => (
            <div
              key={team.id}
              onClick={() => router.push(`/teams/${team.id}`)}
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: "1rem",
                background: "#fff",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                {team.logoUrl && (
                  <img
                    src={team.logoUrl}
                    alt={team.name}
                    style={{ width: 50, height: 50, borderRadius: 6, objectFit: "cover" }}
                  />
                )}
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{team.name}</h3>
              </div>
              <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.7 }}>
                {team._count?.members || team.members?.length || 0} membre{team._count?.members !== 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


