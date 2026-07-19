const API_BASE = "http://localhost:3000";

export async function api<T>(

    path: string,

    init?: RequestInit

): Promise<T> {

    const response = await fetch(

        `${API_BASE}${path}`,

        init

    );

    if (!response.ok) {

        throw new Error(

            `API Error: ${response.status}`

        );

    }

    return (await response.json()) as T;

}