"use client";

import {useTranslations} from "next-intl";
import {useEffect, useRef, useState} from "react";
import {Button} from "@/src/components/ui/button";
import {Card, CardContent} from "@/src/components/ui/card";

type ThreadUser = {
  id: string;
  firstName: string;
  lastName: string;
};

type LatestMessage = {
  id: string;
  body: string;
  senderId: string;
  readAt: string | null;
  createdAt: string;
};

type MessageThread = {
  id: string;
  subject: string;
  creator: ThreadUser;
  recipient: ThreadUser;
  latestMessage: LatestMessage | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

type Physician = {
  id: string;
  name: string;
};

function formatRelativeTime(isoString: string, yesterdayLabel: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
    }
    if (diffDays === 1) {
      return yesterdayLabel;
    }
    if (diffDays < 7) {
      return date.toLocaleDateString([], {weekday: "short"});
    }
    return date.toLocaleDateString([], {month: "short", day: "numeric"});
  } catch {
    return isoString;
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

type ThreadCardProps = {
  thread: MessageThread;
  currentUserId: string | null;
};

function ThreadCard({thread, currentUserId}: ThreadCardProps) {
  const t = useTranslations("MessagesInboxPage");
  const isUnread = thread.unreadCount > 0;

  const otherUser =
    currentUserId === thread.creator.id ? thread.recipient : thread.creator;
  const careTeamName = `${otherUser.firstName} ${otherUser.lastName}`;
  const displayTime = thread.latestMessage
    ? formatRelativeTime(thread.latestMessage.createdAt, t("yesterday"))
    : formatRelativeTime(thread.updatedAt, t("yesterday"));

  return (
    <Card className={isUnread ? "border-primary/40 bg-primary/5" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-sm truncate ${isUnread ? "font-semibold" : "font-medium"}`}>
                {careTeamName}
              </span>
              {isUnread && (
                <span
                  aria-label={t("unreadCount", {count: thread.unreadCount})}
                  className="inline-flex items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground min-w-[1.25rem] shrink-0"
                >
                  {thread.unreadCount}
                </span>
              )}
            </div>
            <p className={`text-xs truncate ${isUnread ? "font-semibold text-foreground" : "text-foreground"}`}>
              {thread.subject}
            </p>
            {thread.latestMessage && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                {truncate(thread.latestMessage.body, 80)}
              </p>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{displayTime}</span>
        </div>
      </CardContent>
    </Card>
  );
}

type ComposeFormProps = {
  physicians: Physician[];
  onSend: (subject: string, body: string, recipientId: string) => Promise<void>;
  onCancel: () => void;
  isSending: boolean;
  sendError: string | null;
};

function ComposeForm({physicians, onSend, onCancel, isSending, sendError}: ComposeFormProps) {
  const t = useTranslations("MessagesInboxPage");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientId, setRecipientId] = useState(physicians[0]?.id ?? "");
  const subjectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    subjectRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientId || !subject.trim() || !body.trim()) return;
    await onSend(subject.trim(), body.trim(), recipientId);
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
      aria-label={t("compose.formLabel")}
    >
      <p className="text-sm font-semibold">{t("compose.title")}</p>

      {sendError && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {sendError}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="compose-recipient">
          {t("compose.recipientLabel")}
        </label>
        {physicians.length > 0 ? (
          <select
            id="compose-recipient"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            required
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            {physicians.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="compose-recipient"
            type="text"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            placeholder={t("compose.recipientPlaceholder")}
            required
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="compose-subject">
          {t("compose.subjectLabel")}
        </label>
        <input
          id="compose-subject"
          ref={subjectRef}
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t("compose.subjectPlaceholder")}
          required
          maxLength={200}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="compose-body">
          {t("compose.bodyLabel")}
        </label>
        <textarea
          id="compose-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("compose.bodyPlaceholder")}
          required
          rows={5}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground resize-none"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="h-8 px-3 text-xs" disabled={isSending}>
          {isSending ? t("compose.sending") : t("compose.send")}
        </Button>
        <Button
          type="button"
          className="h-8 px-3 text-xs border border-border bg-transparent text-foreground hover:bg-secondary"
          onClick={onCancel}
          disabled={isSending}
        >
          {t("compose.cancel")}
        </Button>
      </div>
    </form>
  );
}

export default function MessagesInboxPage() {
  const t = useTranslations("MessagesInboxPage");

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const [threadsRes, physiciansRes] = await Promise.all([
          fetch("/api/messages"),
          fetch("/api/physicians"),
        ]);

        if (threadsRes.status === 401) {
          if (!cancelled) setError(t("errors.unauthorized"));
          return;
        }

        if (!threadsRes.ok) {
          if (!cancelled) setError(t("errors.loadFailed"));
          return;
        }

        const threadsData = (await threadsRes.json()) as {threads: MessageThread[]};

        const physiciansData = physiciansRes.ok
          ? ((await physiciansRes.json()) as {physicians: Physician[]})
          : {physicians: []};

        if (!cancelled) {
          setThreads(threadsData.threads);
          setPhysicians(physiciansData.physicians);
          // currentUserId stays null; ThreadCard falls back to displaying the creator
          // as the care team representative when the viewer cannot be determined client-side.
        }
      } catch {
        if (!cancelled) setError(t("errors.loadFailed"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [t]);

  async function handleSend(subject: string, body: string, recipientId: string) {
    setIsSending(true);
    setSendError(null);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({subject, body, recipientId}),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const apiError =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as {error: unknown}).error)
            : null;
        setSendError(apiError ?? t("errors.sendFailed"));
        return;
      }

      const newThread = (await res.json()) as MessageThread;
      setThreads((prev) => [newThread, ...prev]);
      setShowCompose(false);
    } catch {
      setSendError(t("errors.sendFailed"));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {!showCompose && (
          <Button
            type="button"
            className="h-9 px-4 text-sm shrink-0"
            onClick={() => {
              setSendError(null);
              setShowCompose(true);
            }}
          >
            {t("newMessage")}
          </Button>
        )}
      </div>

      {showCompose && (
        <ComposeForm
          physicians={physicians}
          onSend={handleSend}
          onCancel={() => setShowCompose(false)}
          isSending={isSending}
          sendError={sendError}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : error ? (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
