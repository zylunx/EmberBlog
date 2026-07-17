import { liteClient as algoliasearch } from "algoliasearch/lite";
import { type AlgoliaPublicConfig, getAlgoliaPublicConfig } from "./config";
import type { SearchProviderClient, UnifiedSearchHit } from "./types";

type HighlightResult = {
	value?: string;
	matchedWords?: string[];
};

type AlgoliaHit = {
	objectID: string;
	url: string;
	title: string;
	description?: string;
	content?: string;
	tags?: string[];
	categories?: string[];
	_highlightResult?: {
		title?: HighlightResult;
		description?: HighlightResult;
		content?: HighlightResult;
	};
	_snippetResult?: {
		content?: { value?: string };
		description?: { value?: string };
	};
};

function stripHighlightMarkers(html: string): string {
	return html.replace(/<\/?mark>/gi, "");
}

function pickExcerpt(hit: AlgoliaHit): string {
	const snippet =
		hit._snippetResult?.content?.value ||
		hit._snippetResult?.description?.value ||
		hit._highlightResult?.content?.value ||
		hit._highlightResult?.description?.value ||
		hit.description ||
		"";
	return snippet;
}

function mapHit(
	hit: AlgoliaHit,
	index: number,
	queryID?: string,
	positionOffset = 0,
): UnifiedSearchHit {
	const title = hit._highlightResult?.title?.value || hit.title || hit.objectID;
	return {
		objectID: hit.objectID,
		url: hit.url,
		title,
		excerpt: pickExcerpt(hit),
		tags: hit.tags,
		categories: hit.categories,
		queryID,
		position: positionOffset + index + 1,
	};
}

export function createAlgoliaClient(
	config?: AlgoliaPublicConfig | null,
): SearchProviderClient {
	const cfg = config ?? getAlgoliaPublicConfig();
	if (!cfg) {
		throw new Error("Algolia public config is incomplete");
	}

	const client = algoliasearch(cfg.appId, cfg.searchKey);

	return {
		name: "algolia",
		ready: async () => {
			// lite client needs no async init
		},
		search: async (query, options) => {
			const q = query.trim();
			if (!q) return [];

			const limit = options?.limit ?? 20;
			const response = await client.search({
				requests: [
					{
						indexName: cfg.indexName,
						query: q,
						hitsPerPage: limit,
						attributesToRetrieve: [
							"url",
							"title",
							"description",
							"tags",
							"categories",
						],
						attributesToHighlight: ["title", "description", "content"],
						attributesToSnippet: ["content:20", "description:20"],
						highlightPreTag: "<mark>",
						highlightPostTag: "</mark>",
					},
				],
			});

			const result = response.results[0] as {
				hits?: AlgoliaHit[];
				queryID?: string;
			};
			const hits = result?.hits ?? [];
			const queryID = result?.queryID;
			return hits.map((hit, i) => mapHit(hit, i, queryID));
		},
		searchPage: async (query, options) => {
			const q = query.trim();
			const pageSize = Math.max(1, Math.floor(options.pageSize));
			const requestedPage = Math.max(1, Math.floor(options.page));
			if (!q) {
				return { hits: [], page: 1, totalHits: 0, totalPages: 0 };
			}

			const response = await client.search({
				requests: [
					{
						indexName: cfg.indexName,
						query: q,
						page: requestedPage - 1,
						hitsPerPage: pageSize,
						attributesToRetrieve: [
							"url",
							"title",
							"description",
							"tags",
							"categories",
						],
						attributesToHighlight: ["title", "description", "content"],
						attributesToSnippet: ["content:20", "description:20"],
						highlightPreTag: "<mark>",
						highlightPostTag: "</mark>",
					},
				],
			});

			const result = response.results[0] as {
				hits?: AlgoliaHit[];
				nbHits?: number;
				nbPages?: number;
				page?: number;
				queryID?: string;
			};
			const hits = result?.hits ?? [];
			const page = (result?.page ?? requestedPage - 1) + 1;
			return {
				hits: hits.map((hit, index) =>
					mapHit(hit, index, result?.queryID, (page - 1) * pageSize),
				),
				page,
				totalHits: result?.nbHits ?? hits.length,
				totalPages: result?.nbPages ?? (hits.length > 0 ? 1 : 0),
			};
		},
	};
}

/** Escape helper if raw title without highlight is rendered as HTML */
export function plainTitleFromHit(hit: UnifiedSearchHit): string {
	return stripHighlightMarkers(hit.title);
}
