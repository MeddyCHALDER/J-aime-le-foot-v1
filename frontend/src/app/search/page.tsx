"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type PlayerResult = {
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

type PostResult = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    username: string | null;
  };
  _count: {
    likes: number;
    comments: number;
  };
};

type TeamResult = {
  id: string;
  name: string;
  logoUrl: string | null;
  _count: {
    members: number;
  };
};

type SearchResults = {
  players: PlayerResult[];
  posts: PostResult[];
  teams: TeamResult[];
};

// useSearchParams() force le rendu client : il lui faut une frontière Suspense,
// sinon le prérendu de la route échoue au build.
export default function SearchPageWrapper() {
  return (
    <Suspense fallback={null}>
      <SearchPage />
    </Suspense>
  );
}

function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [type, setType] = useState<"all" | "players" | "posts" | "teams">("all");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim()) {
      performSearch();
    }
  }, [query, type]);

  async function performSearch() {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query.trim() });
      if (type !== "all") {
        params.append("type", type);
      }
      const data = await apiFetch<SearchResults>(`/search?${params.toString()}`);
      setResults(data);
      // Mettre à jour l'URL sans recharger la page
      router.replace(`/search?q=${encodeURIComponent(query.trim())}${type !== "all" ? `&type=${type}` : ""}`);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    performSearch();
  }

  const totalResults = results
    ? (results.players?.length || 0) + (results.posts?.length || 0) + (results.teams?.length || 0)
    : 0;

  return (
    <section style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
      <h1>Recherche</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher des joueurs, posts, équipes..."
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: "1rem",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: 6,
              border: "none",
              backgroundColor: "#1e90ff",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Recherche..." : "Rechercher"}
          </button>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="type"
              value="all"
              checked={type === "all"}
              onChange={() => setType("all")}
            />
            <span>Tout</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="type"
              value="players"
              checked={type === "players"}
              onChange={() => setType("players")}
            />
            <span>Joueurs</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="type"
              value="posts"
              checked={type === "posts"}
              onChange={() => setType("posts")}
            />
            <span>Posts</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="type"
              value="teams"
              checked={type === "teams"}
              onChange={() => setType("teams")}
            />
            <span>Équipes</span>
          </label>
        </div>
      </form>

      {error && (
        <div style={{ padding: "0.75rem", background: "#fee", color: "#c33", borderRadius: 6, marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Recherche en cours...</p>
      ) : results ? (
        <>
          {totalResults === 0 ? (
            <p style={{ opacity: 0.7, textAlign: "center", padding: "2rem" }}>
              Aucun résultat trouvé pour "{query}"
            </p>
          ) : (
            <>
              {/* Résultats joueurs */}
              {(type === "all" || type === "players") && results.players && results.players.length > 0 && (
                <div style={{ marginBottom: "2rem" }}>
                  <h2>Joueurs ({results.players.length})</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                    {results.players.map((player) => (
                      <div
                        key={player.id}
                        onClick={() =>
                          router.push(
                            player.user.username ? `/players/username/${player.user.username}` : `/players/${player.id}`
                          )
                        }
                        style={{
                          padding: "1rem",
                          border: "1px solid #eee",
                          borderRadius: 8,
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
                        <div style={{ fontWeight: "bold" }}>
                          {player.firstName} {player.lastName}
                        </div>
                        {player.user.username && (
                          <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>@{player.user.username}</div>
                        )}
                        {player.position && (
                          <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>{player.position}</div>
                        )}
                        {player.cards.length > 0 && (
                          <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>⭐ {player.cards[0].overallRating}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Résultats posts */}
              {(type === "all" || type === "posts") && results.posts && results.posts.length > 0 && (
                <div style={{ marginBottom: "2rem" }}>
                  <h2>Posts ({results.posts.length})</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                    {results.posts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => router.push(`/`)}
                        style={{
                          padding: "1rem",
                          border: "1px solid #eee",
                          borderRadius: 8,
                          background: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <h3 style={{ margin: 0 }}>{post.title}</h3>
                          <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                            {post.user.username ? `@${post.user.username}` : post.user.email}
                          </span>
                        </div>
                        {post.description && (
                          <p style={{ margin: "0.5rem 0", opacity: 0.8 }}>{post.description}</p>
                        )}
                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem", opacity: 0.7, marginTop: "0.5rem" }}>
                          <span>❤️ {post._count.likes}</span>
                          <span>💬 {post._count.comments}</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Résultats équipes */}
              {(type === "all" || type === "teams") && results.teams && results.teams.length > 0 && (
                <div style={{ marginBottom: "2rem" }}>
                  <h2>Équipes ({results.teams.length})</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                    {results.teams.map((team) => (
                      <div
                        key={team.id}
                        onClick={() => router.push(`/teams/${team.id}`)}
                        style={{
                          padding: "1rem",
                          border: "1px solid #eee",
                          borderRadius: 8,
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
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          {team.logoUrl && (
                            <img
                              src={team.logoUrl}
                              alt={team.name}
                              style={{ width: 50, height: 50, borderRadius: 6, objectFit: "cover" }}
                            />
                          )}
                          <div>
                            <div style={{ fontWeight: "bold" }}>{team.name}</div>
                            <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                              {team._count.members} membre{team._count.members !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <p style={{ opacity: 0.7, textAlign: "center", padding: "2rem" }}>
          Entrez un terme de recherche pour commencer
        </p>
      )}
    </section>
  );
}


