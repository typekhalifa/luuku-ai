export interface ApiClientConfig {
  baseUrl: string;
  headers?: HeadersInit;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly headers: HeadersInit;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.headers = {
      "Content-Type": "application/json",
      ...config.headers,
    };
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, {
      method: "GET",
    });
  }

  async post<T>(
    path: string,
    body?: unknown,
  ): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(
    path: string,
    body?: unknown,
  ): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, {
      method: "DELETE",
    });
  }

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  }
}