/** Unified hit shape consumed by navbar / custom search UIs */
export type UnifiedSearchHit = {
	objectID: string;
	url: string;
	title: string;
	/** HTML snippet; may contain <mark> */
	excerpt: string;
	tags?: string[];
	categories?: string[];
	/** Algolia queryID for Insights (optional) */
	queryID?: string;
	/** 1-based position in the result list (Insights) */
	position?: number;
};

export type SearchQueryOptions = {
	/** Max hits to return (navbar uses 5+) */
	limit?: number;
};

export type SearchProviderClient = {
	readonly name: "pagefind" | "algolia";
	search: (
		query: string,
		options?: SearchQueryOptions,
	) => Promise<UnifiedSearchHit[]>;
	ready: () => Promise<void>;
};
