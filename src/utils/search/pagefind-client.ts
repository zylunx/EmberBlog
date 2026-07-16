import type { SearchResult } from "@/global";
import type { SearchProviderClient, UnifiedSearchHit } from "./types";

function mapPagefindHit(item: SearchResult, index: number): UnifiedSearchHit {
	return {
		objectID: item.url || String(index),
		url: item.url,
		title: item.meta?.title ?? "",
		excerpt: item.excerpt || item.content || "",
		position: index + 1,
	};
}

function waitForPagefind(): Promise<void> {
	if (typeof window === "undefined") return Promise.resolve();
	if (window.pagefind) return Promise.resolve();

	return new Promise((resolve) => {
		const done = () => resolve();
		document.addEventListener("pagefindready", done, { once: true });
		document.addEventListener("pagefindloaderror", done, { once: true });
		// Dev has no pagefind; don't hang forever
		window.setTimeout(done, 3000);
	});
}

const fakeDevResults: SearchResult[] = [
	{
		url: "/",
		meta: { title: "Dev Mode Search Result 1" },
		excerpt: "This is a <mark>mock</mark> result for development.",
	},
	{
		url: "/",
		meta: { title: "Dev Mode Search Result 2" },
		excerpt: "Pagefind only works in <mark>production</mark> build.",
	},
];

export function createPagefindClient(): SearchProviderClient {
	let readyPromise: Promise<void> | null = null;

	return {
		name: "pagefind",
		ready: async () => {
			if (import.meta.env.DEV) return;
			readyPromise ??= waitForPagefind();
			await readyPromise;
		},
		search: async (query, options) => {
			const q = query.trim();
			if (!q) return [];

			if (import.meta.env.DEV) {
				return fakeDevResults
					.filter(
						(item) =>
							item.excerpt.toLowerCase().includes(q.toLowerCase()) ||
							item.meta.title.toLowerCase().includes(q.toLowerCase()),
					)
					.map(mapPagefindHit);
			}

			await waitForPagefind();
			if (!window.pagefind) return [];

			const response = await window.pagefind.search(q);
			const raw = await Promise.all(
				response.results.map((item) => item.data()),
			);
			const limit = options?.limit;
			const sliced = typeof limit === "number" ? raw.slice(0, limit) : raw;
			return sliced.map(mapPagefindHit);
		},
	};
}
