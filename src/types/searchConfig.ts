export type SearchProvider = "pagefind" | "algolia";

export type AlgoliaIndexNames = {
	/** Local / non-production index */
	dev: string;
	/** Production index */
	prod: string;
};

export type AlgoliaSearchConfig = {
	/**
	 * Algolia Application ID.
	 * Can be overridden by `PUBLIC_ALGOLIA_APP_ID`.
	 */
	appId: string;
	/**
	 * Index names for each environment.
	 * Override with `PUBLIC_ALGOLIA_INDEX` when needed.
	 */
	indexName: AlgoliaIndexNames;
	/**
	 * When true, a failed index push aborts `pnpm build`.
	 * @default true
	 */
	failBuildOnIndexError: boolean;
	/**
	 * Enable Algolia Insights click tracking in the UI.
	 * @default true
	 */
	insights: boolean;
	/**
	 * Hits per page on `/search` InstantSearch.
	 * @default 10
	 */
	hitsPerPage: number;
};

export type SearchConfig = {
	/**
	 * Preferred search provider.
	 * Falls back to Pagefind at build/runtime when Algolia public config is incomplete.
	 */
	provider: SearchProvider;
	algolia: AlgoliaSearchConfig;
};
