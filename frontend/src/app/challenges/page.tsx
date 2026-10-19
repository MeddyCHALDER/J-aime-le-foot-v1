"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Challenge = {
  id: string;
  title: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
};

type ChallengeEntry = {
  id: string;
  challengeId: string;
  postId: string;
  userId: string;
  createdAt: string;
};

type Post = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  createdAt: string;
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStart, setCreateStart] = useState("");
  const [createEnd, setCreateEnd] = useState("");

  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("");
  const [participationPostId, setParticipationPostId] = useState("");
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);

  // Création de post depuis la page challenge
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [postVideoUrl, setPostVideoUrl] = useState("");
  const [postVideoFile, setPostVideoFile] = useState<File | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

  const hasToken = useMemo(() => Boolean(token), [token]);

  async function loadChallenges() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Challenge[]>("/challenges");
      setChallenges(data);
      // Si aucune sélection, on prend le premier pour la section participations
      if (data.length > 0 && !selectedChallengeId) {
        setSelectedChallengeId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Impossible de charger les challenges");
    } finally {
      setLoading(false);
    }
  }

  async function loadEntries(challengeId: string) {
    if (!challengeId) return;
    try {
      const data = await apiFetch<ChallengeEntry[]>(`/challenges/${challengeId}/entries`);
      setEntries(data);
    } catch (err: any) {
      console.error("Erreur chargement entries", err);
    }
  }

  useEffect(() => {
    loadChallenges();
  }, []);

  useEffect(() => {
    if (selectedChallengeId) {
      loadEntries(selectedChallengeId);
    }
  }, [selectedChallengeId]);

  async function handleCreateChallenge(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Tu dois être connecté pour créer un challenge.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch<Challenge>(
        "/challenges",
        {
          method: "POST",
          body: JSON.stringify({
            title: createTitle,
            description: createDescription,
            startDate: createStart || null,
            endDate: createEnd || null,
          }),
        },
        token
      );
      setCreateTitle("");
      setCreateDescription("");
      setCreateStart("");
      setCreateEnd("");
      await loadChallenges();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du challenge");
    } finally {
      setLoading(false);
    }
  }

  async function handleParticipate(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Tu dois être connecté pour participer.");
      return;
    }
    if (!selectedChallengeId) {
      setError("Choisis un challenge avant de participer.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch<ChallengeEntry>(
        `/challenges/${selectedChallengeId}/entries`,
        {
          method: "POST",
          body: JSON.stringify({ postId: participationPostId }),
        },
        token
      );
      setParticipationPostId("");
      await loadEntries(selectedChallengeId);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la participation");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Tu dois être connecté pour créer un post.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let finalVideoUrl = postVideoUrl;

      if (postVideoFile) {
        const formData = new FormData();
        formData.append("file", postVideoFile);
        const uploadRes = await apiFetch<{ url: string }>("/upload", { method: "POST", body: formData }, token);
        finalVideoUrl = uploadRes.url;
      }

      if (!finalVideoUrl) {
        throw new Error("Fournis un fichier vidéo ou une URL.");
      }

      const newPost = await apiFetch<Post>(
        "/posts",
        {
          method: "POST",
          body: JSON.stringify({
            title: postTitle,
            description: postDescription,
            videoUrl: finalVideoUrl,
          }),
        },
        token
      );
      // On prépare la participation avec l'ID du post créé
      setParticipationPostId(newPost.id);
      setPostTitle("");
      setPostDescription("");
      setPostVideoUrl("");
      setPostVideoFile(null);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1>Challenges</h1>
        <p style={{ fontSize: "0.95rem", opacity: 0.85 }}>
          Découvre les challenges, participe avec tes posts vidéo, et crée tes propres défis
          si tu es connecté.
        </p>
      </div>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          padding: "1rem",
          background: "#f7f8fb",
        }}
      >
        <h2>Créer un challenge</h2>
        <p style={{ fontSize: "0.9rem", opacity: 0.8, marginBottom: "0.75rem" }}>
          {hasToken
            ? `Connecté en tant que ${userEmail}`
            : "Connecte-toi pour créer un challenge"}
        </p>
        <form
          onSubmit={handleCreateChallenge}
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 600 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span>Titre *</span>
            <input
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              required
              placeholder="Ex : Plus beau but du week-end"
              style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span>Description</span>
            <textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              rows={3}
              placeholder="Règles, durée, critères..."
              style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
            />
          </label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
              <span>Début</span>
              <input
                type="date"
                value={createStart}
                onChange={(e) => setCreateStart(e.target.value)}
                style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
              <span>Fin</span>
              <input
                type="date"
                value={createEnd}
                onChange={(e) => setCreateEnd(e.target.value)}
                style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
              />
            </label>
          </div>
          {error && (
            <p style={{ color: "red", fontSize: "0.9rem" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              alignSelf: "flex-start",
              padding: "0.6rem 1rem",
              borderRadius: 6,
              border: "none",
              backgroundColor: "#1e90ff",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {loading ? "Création..." : "Créer le challenge"}
          </button>
        </form>
      </div>

      <div>
        <h2>Liste des challenges</h2>
        {loading && challenges.length === 0 && <p>Chargement...</p>}
        {error && challenges.length === 0 && (
          <p style={{ color: "red", fontSize: "0.9rem" }}>{error}</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
          {challenges.map((c) => (
            <article
              key={c.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: "0.75rem 1rem",
                background: "#fff",
                cursor: "pointer",
                outline: c.id === selectedChallengeId ? "2px solid #1e90ff" : "none",
              }}
              onClick={() => setSelectedChallengeId(c.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>{c.title}</h3>
                <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                  Créé le {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>
              {c.description && (
                <p style={{ margin: "0.3rem 0 0.5rem", opacity: 0.9 }}>{c.description}</p>
              )}
              <p style={{ fontSize: "0.85rem", opacity: 0.75, margin: 0 }}>
                Période :{" "}
                {c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"}{" "}
                →{" "}
                {c.endDate ? new Date(c.endDate).toLocaleDateString() : "—"}
              </p>
            </article>
          ))}
          {challenges.length === 0 && !loading && <p>Aucun challenge pour le moment.</p>}
        </div>
      </div>

      {selectedChallengeId && (
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: "1rem",
            background: "#f7f8fb",
          }}
        >
          <h2>Participer au challenge sélectionné</h2>
          <p style={{ fontSize: "0.9rem", opacity: 0.8, marginBottom: "0.75rem" }}>
            Saisis l’ID du post vidéo que tu veux associer à ce challenge.
          </p>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "0.75rem 1rem",
              background: "#fff",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Créer un post vidéo (rapide)</h3>
            <p style={{ fontSize: "0.9rem", opacity: 0.8, marginBottom: "0.5rem" }}>
              Le post sera créé, et son ID sera prérempli pour la participation.
            </p>
            <form
              onSubmit={handleCreatePost}
              style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span>Titre *</span>
                <input
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  required
                  placeholder="Ex : But en volley"
                  style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span>Description</span>
                <textarea
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  rows={2}
                  placeholder="Contexte rapide..."
                  style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span>URL de la vidéo</span>
                <input
                  value={postVideoUrl}
                  onChange={(e) => setPostVideoUrl(e.target.value)}
                  placeholder="https://..."
                  style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span>Ou charger une vidéo</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setPostVideoFile(e.target.files?.[0] || null)}
                  style={{ padding: "0.35rem 0", borderRadius: 6, border: "1px solid #ccc" }}
                />
                {postVideoFile && (
                  <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                    Fichier : {postVideoFile.name}
                  </span>
                )}
              </label>
              <button
                type="submit"
                disabled={loading}
                style={{
                  alignSelf: "flex-start",
                  padding: "0.55rem 0.9rem",
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: "#16a34a",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {loading ? "Création..." : "Créer le post"}
              </button>
            </form>
          </div>

          <form
            onSubmit={handleParticipate}
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 500 }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span>ID du post</span>
              <input
                value={participationPostId}
                onChange={(e) => setParticipationPostId(e.target.value)}
                placeholder="post_xxx"
                required
                style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
              />
            </label>
            {error && (
              <p style={{ color: "red", fontSize: "0.9rem" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                alignSelf: "flex-start",
                padding: "0.6rem 1rem",
                borderRadius: 6,
                border: "none",
                backgroundColor: "#1e90ff",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {loading ? "Participation..." : "Participer"}
            </button>
          </form>

          <div style={{ marginTop: "1rem" }}>
            <h3>Participations</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {entries.map((e) => (
                <div
                  key={e.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    padding: "0.5rem 0.75rem",
                    background: "#fff",
                    fontSize: "0.95rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Post: {e.postId}</span>
                    <span style={{ opacity: 0.7, fontSize: "0.85rem" }}>
                      {new Date(e.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ opacity: 0.8, fontSize: "0.9rem" }}>Par: {e.userId}</div>
                </div>
              ))}
              {entries.length === 0 && <p>Aucune participation pour l’instant.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


