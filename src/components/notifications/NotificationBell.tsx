"use client";

import {useEffect, useRef, useState, useCallback} from "react";
import {useRouter, useParams} from "next/navigation";
import {useTranslations} from "next-intl";

// ── Types ────────────────────────────────────────────────────────────────────

type NotificationType = "APPOINTMENT" | "LAB_RESULT" | "MESSAGE" | "REMINDER" | "SYSTEM";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  resourceId: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const NOTIFICATIONS_API_URL = "/api/notifications?limit=10";
const POLL_INTERVAL_MS = 60_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

type TimestampTranslations = {
  justNow: string;
  minutesAgo: (mins: number) => string;
  hoursAgo: (hours: number) => string;
  daysAgo: (days: number) => string;
};

function formatTimestamp(isoString: string, ts: TimestampTranslations, locale: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return ts.justNow;
  if (diffMins < 60) return ts.minutesAgo(diffMins);
  if (diffHours < 24) return ts.hoursAgo(diffHours);
  if (diffDays < 7) return ts.daysAgo(diffDays);
  return date.toLocaleDateString(locale);
}

function getNotificationHref(notification: Notification, locale: string): string {
  const {resourceId, type} = notification;

  switch (type) {
    case "APPOINTMENT":
    case "REMINDER":
      return resourceId
        ? `/${locale}/appointments/${resourceId}`
        : `/${locale}/appointments`;
    case "LAB_RESULT":
      return resourceId
        ? `/${locale}/results/${resourceId}`
        : `/${locale}/results`;
    case "MESSAGE":
      return resourceId
        ? `/${locale}/messages/${resourceId}`
        : `/${locale}/messages`;
    default:
      return `/${locale}/dashboard`;
  }
}

// ── Type icons ────────────────────────────────────────────────────────────────

function NotificationTypeIcon({type}: {type: NotificationType}) {
  switch (type) {
    case "APPOINTMENT":
      return (
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "LAB_RESULT":
      return (
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l3 3 3-3V3" />
        </svg>
      );
    case "MESSAGE":
      return (
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "REMINDER":
      return (
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    default:
      return (
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function NotificationBell() {
  const t = useTranslations("NotificationBell");
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === "string" ? params.locale : "en";

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const timestampTranslations: TimestampTranslations = {
    justNow: t("timestamp.justNow"),
    minutesAgo: (mins) => t("timestamp.minutesAgo", {count: mins}),
    hoursAgo: (hours) => t("timestamp.hoursAgo", {count: hours}),
    daysAgo: (days) => t("timestamp.daysAgo", {count: days}),
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(NOTIFICATIONS_API_URL);
      if (!res.ok) return;
      const data: NotificationsResponse = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silently fail — the bell is non-critical UI
    }
  }, []);

  // Initial fetch + polling, paused when the tab is hidden
  useEffect(() => {
    void fetchNotifications();

    let interval: ReturnType<typeof setInterval> | null = setInterval(
      () => void fetchNotifications(),
      POLL_INTERVAL_MS,
    );

    function handleVisibilityChange() {
      if (document.hidden) {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      } else {
        void fetchNotifications();
        interval = setInterval(() => void fetchNotifications(), POLL_INTERVAL_MS);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function markAsRead(notificationId: string) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({id: notificationId}),
      });
      if (!res.ok) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? {...n, isRead: true} : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    const href = getNotificationHref(notification, locale);
    setOpen(false);
    router.push(href);
  }

  const toggleDropdown = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={
          unreadCount > 0
            ? t("ariaLabelWithCount", {count: unreadCount})
            : t("ariaLabel")
        }
        aria-expanded={open}
        aria-haspopup="true"
        onClick={toggleDropdown}
        className="relative rounded-md border border-border p-2 text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
      >
        {/* Bell icon */}
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground leading-none"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          aria-label={t("dropdownLabel")}
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border border-border bg-background shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">{t("title")}</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {t("unreadBadge", {count: unreadCount})}
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <ul role="list" className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => void handleNotificationClick(notification)}
                    className={[
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground",
                      !notification.isRead ? "bg-secondary/50" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="mt-0.5">
                      <NotificationTypeIcon type={notification.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={[
                          "truncate text-sm",
                          !notification.isRead ? "font-semibold" : "font-medium",
                        ].join(" ")}
                      >
                        {notification.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.content}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatTimestamp(notification.createdAt, timestampTranslations, locale)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <span
                        aria-label={t("unreadDot")}
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
