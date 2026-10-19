"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Conversation = {
  userId: string;
  user: {
    id: string;
    email: string;
    username: string | null;
  };
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    sender: {
      id: string;
      email: string;
      username: string | null;
    };
  } | null;
  unreadCount: number;
};

type Message = {
  id: string;
  content: string;
  createdAt: string;
  read: boolean;
  sender: {
    id: string;
    email: string;
    username: string | null;
  };
  receiver: {
    id: string;
    email: string;
    username: string | null;
  };
};

type ConversationDetail = {
  user: {
    id: string;
    email: string;
    username: string | null;
  };
  messages: Message[];
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

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
    if (storedToken) {
      loadConversations();
      loadUnreadCount();
      // Rafraîchir toutes les 30 secondes
      const interval = setInterval(() => {
        loadConversations();
        loadUnreadCount();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadConversation(selectedConversation.user.id);
    }
  }, [selectedConversation?.user.id]);

  async function loadConversations() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Conversation[]>("/messages/conversations", {}, token);
      setConversations(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Impossible de charger les conversations");
    } finally {
      setLoading(false);
    }
  }

  async function loadUnreadCount() {
    if (!token) return;
    try {
      const data = await apiFetch<{ count: number }>("/messages/unread-count", {}, token);
      setUnreadCount(data.count);
    } catch (err) {
      console.error("Erreur chargement unread count", err);
    }
  }

  async function loadConversation(otherUserId: string) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ConversationDetail>(`/messages/conversations/${otherUserId}`, {}, token);
      setSelectedConversation(data);
      loadConversations(); // Rafraîchir la liste pour mettre à jour les non lus
      loadUnreadCount();
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Impossible de charger la conversation");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedConversation || !newMessage.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await apiFetch(
        "/messages",
        {
          method: "POST",
          body: JSON.stringify({
            receiverId: selectedConversation.user.id,
            content: newMessage.trim(),
          }),
        },
        token
      );
      setNewMessage("");
      loadConversation(selectedConversation.user.id);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Erreur lors de l'envoi du message");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <section style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
        <h1>Messagerie</h1>
        <p>Vous devez être connecté pour accéder à la messagerie.</p>
        <a href="/auth/login" style={{ color: "#1e90ff" }}>
          Se connecter
        </a>
      </section>
    );
  }

  return (
    <section style={{ padding: "2rem", maxWidth: 1400, margin: "0 auto" }}>
      <h1>Messagerie {unreadCount > 0 && <span style={{ fontSize: "0.8rem", color: "#ef4444" }}>({unreadCount} non lu{unreadCount > 1 ? "s" : ""})</span>}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1rem", marginTop: "1.5rem", height: "calc(100vh - 200px)" }}>
        {/* Liste des conversations */}
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: "0.5rem",
            background: "#f7f8fb",
            overflowY: "auto",
          }}
        >
          {loading && !conversations.length ? (
            <p style={{ padding: "1rem", textAlign: "center" }}>Chargement...</p>
          ) : conversations.length === 0 ? (
            <p style={{ padding: "1rem", textAlign: "center", opacity: 0.7 }}>Aucune conversation</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.userId}
                onClick={() => loadConversation(conv.userId)}
                style={{
                  padding: "0.75rem",
                  background: selectedConversation?.user.id === conv.userId ? "#fff" : "transparent",
                  borderRadius: 6,
                  cursor: "pointer",
                  border: selectedConversation?.user.id === conv.userId ? "2px solid #1e90ff" : "1px solid transparent",
                  marginBottom: "0.5rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: "bold" }}>
                    {conv.user.username ? `@${conv.user.username}` : conv.user.email}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span
                      style={{
                        background: "#ef4444",
                        color: "#fff",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                      }}
                    >
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <div
                    style={{
                      fontSize: "0.85rem",
                      opacity: 0.7,
                      marginTop: "0.25rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {conv.lastMessage.content}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Messages de la conversation sélectionnée */}
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: "1rem",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {selectedConversation ? (
            <>
              <div style={{ borderBottom: "1px solid #eee", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                <h2 style={{ margin: 0 }}>
                  Conversation avec {selectedConversation.user.username ? `@${selectedConversation.user.username}` : selectedConversation.user.email}
                </h2>
              </div>

              <div style={{ flex: 1, overflowY: "auto", marginBottom: "1rem" }}>
                {selectedConversation.messages.length === 0 ? (
                  <p style={{ textAlign: "center", opacity: 0.7, padding: "2rem" }}>Aucun message</p>
                ) : (
                  selectedConversation.messages.map((msg) => {
                    const isSent = msg.sender.id === userId;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: isSent ? "flex-end" : "flex-start",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "70%",
                            padding: "0.75rem",
                            borderRadius: 8,
                            background: isSent ? "#1e90ff" : "#f0f0f0",
                            color: isSent ? "#fff" : "#000",
                          }}
                        >
                          <div style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: "0.25rem" }}>
                            {isSent ? "Vous" : msg.sender.username ? `@${msg.sender.username}` : msg.sender.email}
                          </div>
                          <div>{msg.content}</div>
                          <div style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.25rem" }}>
                            {new Date(msg.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Tapez votre message..."
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                  }}
                />
                <button
                  type="submit"
                  disabled={loading || !newMessage.trim()}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: 6,
                    border: "none",
                    backgroundColor: "#1e90ff",
                    color: "#fff",
                    cursor: loading || !newMessage.trim() ? "not-allowed" : "pointer",
                    opacity: loading || !newMessage.trim() ? 0.6 : 1,
                  }}
                >
                  Envoyer
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5 }}>
              <p>Sélectionnez une conversation</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            position: "fixed",
            bottom: "1rem",
            right: "1rem",
            padding: "1rem",
            background: "#fee",
            color: "#c33",
            borderRadius: 6,
            border: "1px solid #fcc",
          }}
        >
          {error}
        </div>
      )}
    </section>
  );
}


