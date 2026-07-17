import type { SearchResult } from "@/global";
import type {
	SearchPageResult,
	SearchProviderClient,
	UnifiedSearchHit,
} from "./types";

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

	const emptyPage = (): SearchPageResult => ({
		hits: [],
		page: 1,
		totalHits: 0,
		totalPages: 0,
	});

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
		searchPage: async (query, options) => {
			const q = query.trim();
			const pageSize = Math.max(1, Math.floor(options.pageSize));
			if (!q) return emptyPage();

			if (import.meta.env.DEV) {
				const matches = fakeDevResults.filter(
					(item) =>
						item.excerpt.toLowerCase().includes(q.toLowerCase()) ||
						item.meta.title.toLowerCase().includes(q.toLowerCase()),
				);
				const totalPages = Math.ceil(matches.length / pageSize);
				const page = Math.min(
					Math.max(1, Math.floor(options.page)),
					totalPages || 1,
				);
				const offset = (page - 1) * pageSize;
				return {
					hits: matches
						.slice(offset, offset + pageSize)
						.map((item, index) => mapPagefindHit(item, offset + index)),
					page,
					totalHits: matches.length,
					totalPages,
				};
			}

			await waitForPagefind();
			if (!window.pagefind) return emptyPage();

			const response = await window.pagefind.search(q);
			const totalHits = response.results.length;
			const totalPages = Math.ceil(totalHits / pageSize);
			const page = Math.min(
				Math.max(1, Math.floor(options.page)),
				totalPages || 1,
			);
			const offset = (page - 1) * pageSize;
			const raw = await Promise.all(
				response.results
					.slice(offset, offset + pageSize)
					.map((item) => item.data()),
			);

			return {
				hits: raw.map((item, index) => mapPagefindHit(item, offset + index)),
				page,
				totalHits,
				totalPages,
			};
		},
	};
}
