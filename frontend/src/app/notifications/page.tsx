"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Notification = {
  id: string;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
  readAt: string | null;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const storedToken = localStorage.getItem("jaimelefoot_token");
    if (storedToken) {
      setToken(storedToken);
      loadNotifications();
      loadUnreadCount();
      // Rafraîchir toutes les 30 secondes
      const interval = setInterval(() => {
        loadNotifications();
        loadUnreadCount();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  async function loadNotifications() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Notification[]>("/notifications", {}, token);
      setNotifications(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Impossible de charger les notifications");
    } finally {
      setLoading(false);
    }
  }

  async function loadUnreadCount() {
    if (!token) return;
    try {
      const data = await apiFetch<{ count: number }>("/notifications/unread-count", {}, token);
      setUnreadCount(data.count);
    } catch (err) {
      console.error("Erreur chargement unread count", err);
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    if (!token) return;
    try {
      await apiFetch(`/notifications/${notificationId}/read`, { method: "PUT" }, token);
      loadNotifications();
      loadUnreadCount();
    } catch (err) {
      console.error("Erreur marquer comme lu", err);
    }
  }

  async function handleMarkAllAsRead() {
    if (!token) return;
    try {
      await apiFetch("/notifications/read-all", { method: "PUT" }, token);
      loadNotifications();
      loadUnreadCount();
    } catch (err) {
      console.error("Erreur marquer tout comme lu", err);
    }
  }

  async function handleDelete(notificationId: string) {
    if (!token || !confirm("Supprimer cette notification ?")) return;
    try {
      await apiFetch(`/notifications/${notificationId}`, { method: "DELETE" }, token);
      loadNotifications();
      loadUnreadCount();
    } catch (err) {
      console.error("Erreur suppression", err);
    }
  }

  function handleClickNotification(notification: Notification) {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case "POST_LIKE":
        return "❤️";
      case "POST_COMMENT":
        return "💬";
      case "NEW_MESSAGE":
        return "✉️";
      case "TEAM_INVITATION":
        return "👥";
      case "CHALLENGE_NEW":
        return "🏆";
      case "AWARD_NOMINATION":
        return "🏅";
      case "MATCH_RESULT":
        return "⚽";
      default:
        return "🔔";
    }
  }

  if (!token) {
    return (
      <section style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
        <h1>Notifications</h1>
        <p>Vous devez être connecté pour voir vos notifications.</p>
        <a href="/auth/login" style={{ color: "#1e90ff" }}>
          Se connecter
        </a>
      </section>
    );
  }

  return (
    <section style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1>
          Notifications {unreadCount > 0 && <span style={{ fontSize: "0.8rem", color: "#ef4444" }}>({unreadCount} non lu{unreadCount > 1 ? "s" : ""})</span>}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: "0.75rem", background: "#fee", color: "#c33", borderRadius: 6, marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {loading && !notifications.length ? (
        <p>Chargement...</p>
      ) : notifications.length === 0 ? (
        <p style={{ opacity: 0.7, textAlign: "center", padding: "2rem" }}>Aucune notification</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleClickNotification(notif)}
              style={{
                padding: "1rem",
                background: notif.read ? "#fff" : "#f0f7ff",
                border: notif.read ? "1px solid #eee" : "1px solid #1e90ff",
                borderRadius: 8,
                cursor: notif.link ? "pointer" : "default",
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
                position: "relative",
              }}
            >
              <div style={{ fontSize: "1.5rem" }}>{getNotificationIcon(notif.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", fontWeight: notif.read ? "normal" : "bold" }}>
                      {notif.title}
                    </h3>
                    {notif.content && (
                      <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.8 }}>{notif.content}</p>
                    )}
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.75rem", opacity: 0.6 }}>
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {!notif.read && (
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#1e90ff",
                          display: "inline-block",
                        }}
                      />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notif.id);
                      }}
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: 4,
                        border: "none",
                        background: "transparent",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


