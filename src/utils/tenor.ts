/*
Helper functions for interacting with the Tenor GIF API.

This is intentionally kept UI-agnostic so it can be reused from different components.
*/

import SdkConfig from "../SdkConfig";

export interface TenorGif {
    id: string;
    url: string;
    tinyUrl?: string;
    width?: number;
    height?: number;
    title?: string;
}

function getApiKey(): string {
    const key = SdkConfig.get("tenor_api_key") as string | undefined;
    if (!key) {
        throw new Error("Tenor API key is not configured (tenor_api_key in config.json)");
    }
    return key;
}

async function requestTenor(endpoint: string, params: Record<string, string | number | undefined>): Promise<any> {
    const apiKey = getApiKey();
    const url = new URL(`https://tenor.googleapis.com/v2/${endpoint}`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("client_key", "element-web");
    // Request only GIF variants we know how to handle
    url.searchParams.set("media_filter", "gif,tinygif");

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
            url.searchParams.set(key, String(value));
        }
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
        throw new Error(`Tenor API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

function mapResults(json: any): TenorGif[] {
    const results: any[] = json?.results ?? [];
    return results
        .map((item) => {
            const formats = item.media_formats ?? item.media ?? {};
            const tiny = formats.tinygif;
            const gif = formats.gif;
            const fallback = Object.values(formats)[0] as any | undefined;
            const chosen = tiny ?? gif ?? fallback;

            if (!chosen?.url) return null;

            const dims = (chosen.dims as number[] | undefined) ?? [];
            return {
                id: item.id ?? chosen.id ?? chosen.url,
                url: (gif ?? chosen).url,
                tinyUrl: (tiny ?? gif ?? chosen).url,
                width: dims[0],
                height: dims[1],
                title: item.content_description ?? item.title ?? "",
            } satisfies TenorGif;
        })
        .filter(Boolean) as TenorGif[];
}

export async function fetchTrendingGifs(limit = 24): Promise<TenorGif[]> {
    const json = await requestTenor("trending", { limit });
    return mapResults(json);
}

export async function searchGifs(query: string, limit = 24): Promise<TenorGif[]> {
    const json = await requestTenor("search", { q: query, limit });
    return mapResults(json);
}
