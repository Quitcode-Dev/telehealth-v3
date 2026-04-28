"use client";

import {useLocale, useTranslations} from "next-intl";
import {useCallback, useEffect, useRef, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {Button} from "@/src/components/ui/button";

type ThreadUser = {
  id: string;
  firstName: string;
  lastName: string;
  isPatient: boolean;
};

type Message = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  isPatientSender: boolean;
  readAt: string | null;
  createdAt: string;
};

type Thread = {
  id: string;
  subject: string;
  creator: ThreadUser;
  recipient: ThreadUser;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

function formatTimestamp(isoString: string, locale: string): string {
  try {
    return new Date(isoString).toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function MessageThreadPage() {
  const t = useTranslations("MessageThreadPage");
  const locale = useLocale();
  const params = useParams<{threadId: string}>();
  const router = useRouter();

  const [thread, setThread] = useState<Thread | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchThread() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/messages/${params.threadId}`);

        if (res.status === 401) {
          if (!cancelled) setError(t("errors.unauthorized"));
          return;
        }
        if (res.status === 404) {
          if (!cancelled) setError(t("errors.notFound"));
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError(t("errors.loadFailed"));
          return;
        }

        const data = (await res.json()) as {thread: Thread; currentUserId: string};

        if (!cancelled) {
          setThread(data.thread);
          setCurrentUserId(data.currentUserId);
        }
      } catch {
        if (!cancelled) setError(t("errors.loadFailed"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchThread();

    // Mark thread as read on open; errors are intentionally ignored as this is a
    // best-effort operation that does not affect message display.
    void fetch(`/api/messages/${params.threadId}/read`, {method: "PATCH"}).catch((err: unknown) => {
      console.warn("[MessageThreadPage] Failed to mark thread as read:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [params.threadId, t]);

  useEffect(() => {
    if ((thread?.messages.length ?? 0) > 0) {
      scrollToBottom();
    }
  }, [thread?.messages.length, scrollToBottom]);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    const body = replyBody.trim();
    if (!body || isSending) return;

    setIsSending(true);
    setSendError(null);

    try {
      const res = await fetch(`/api/messages/${params.threadId}/replies`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({body}),
      });

      if (!res.ok) {
        setSendError(t("errors.sendFailed"));
        return;
      }

      const newMessage = (await res.json()) as {
        id: string;
        body: string;
        senderId: string;
        readAt: string | null;
        createdAt: string;
      };

      if (thread && currentUserId) {
        const currentUser =
          thread.creator.id === currentUserId ? thread.creator : thread.recipient;

        const enrichedMessage: Message = {
          id: newMessage.id,
          body: newMessage.body,
          senderId: newMessage.senderId,
          senderName: `${currentUser.firstName} ${currentUser.lastName}`,
          isPatientSender: currentUser.isPatient,
          readAt: newMessage.readAt,
          createdAt: newMessage.createdAt,
        };

        setThread((prev) =>
          prev ? {...prev, messages: [...prev.messages, enrichedMessage]} : prev,
        );
      }

      setReplyBody("");
      textareaRef.current?.focus();
    } catch {
      setSendError(t("errors.sendFailed"));
    } finally {
      setIsSending(false);
    }
  }

  function getSenderRole(message: Message): string {
    if (message.senderId === currentUserId) return t("you");
    return message.isPatientSender ? t("patient") : t("careTeam");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {/* Back navigation */}
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t("back")}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : error ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : thread ? (
        <>
          {/* Thread header */}
          <div>
            <h1 className="text-xl font-semibold">{thread.subject}</h1>
          </div>

          {/* Messages list */}
          <div className="flex flex-col gap-3 min-h-0">
            {thread.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              thread.messages.map((message) => {
                const isOwn = message.senderId === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col gap-1 rounded-lg p-3 ${
                      isOwn
                        ? "bg-primary/10 border border-primary/20 self-end max-w-[85%]"
                        : "bg-muted border border-border self-start max-w-[85%]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {message.senderName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {getSenderRole(message)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {message.body}
                    </p>
                    <span className="text-xs text-muted-foreground self-end">
                      {formatTimestamp(message.createdAt, locale)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply form */}
          <form
            onSubmit={handleSendReply}
            className="flex flex-col gap-2 border-t border-border pt-4 mt-2"
            aria-label={t("replyFormLabel")}
          >
            {sendError && (
              <p
                role="alert"
                className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {sendError}
              </p>
            )}
            <label className="text-xs text-muted-foreground" htmlFor="reply-body">
              {t("replyLabel")}
            </label>
            <textarea
              id="reply-body"
              ref={textareaRef}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={t("replyPlaceholder")}
              required
              rows={3}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground resize-none"
            />
            <div className="flex justify-end">
              <Button type="submit" className="h-8 px-4 text-xs" disabled={isSending || !replyBody.trim()}>
                {isSending ? t("sending") : t("send")}
              </Button>
            </div>
          </form>
        </>
      ) : null}
    </div>
  );
}
