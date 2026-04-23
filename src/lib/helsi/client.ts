type Primitive = string | number | boolean;
type QueryValue = Primitive | null | undefined;

export type HelsiClientOptions = {
  baseUrl?: string;
  apiToken?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: HeadersInit;
};

export class HelsiApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HelsiApiError";
    this.status = status;
  }
}

function getDefaultBaseUrl() {
  const baseUrl = process.env.HELSI_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("HELSI_API_BASE_URL is not configured");
  }

  return baseUrl;
}

function getDefaultApiToken() {
  const apiToken = process.env.HELSI_API_TOKEN;
  if (!apiToken) {
    throw new Error("HELSI_API_TOKEN is not configured");
  }

  return apiToken;
}

export class HelsiApiClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options?: HelsiClientOptions) {
    this.baseUrl = options?.baseUrl ?? getDefaultBaseUrl();
    this.apiToken = options?.apiToken ?? getDefaultApiToken();
    this.timeoutMs = options?.timeoutMs ?? 10_000;
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  async get<T>(path: string, query?: Record<string, QueryValue>) {
    return this.request<T>(path, {
      method: "GET",
      query,
    });
  }

  async post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body,
    });
  }

  async request<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        method: options?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
          ...options?.headers,
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HelsiApiError(
          `Helsi API request failed with status ${response.status}${errorText ? `: ${errorText}` : ""}`,
          response.status,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof HelsiApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Helsi API request to ${path} timed out after ${this.timeoutMs}ms`);
      }

      throw new Error(
        error instanceof Error ? `Helsi API request failed: ${error.message}` : "Helsi API request failed",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
