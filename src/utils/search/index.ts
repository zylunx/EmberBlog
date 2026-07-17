import { createAlgoliaClient } from "./algolia-client";
import { getAlgoliaPublicConfig, getEffectiveSearchProvider } from "./config";
import { createPagefindClient } from "./pagefind-client";
import type { SearchProviderClient } from "./types";

export {
	getAlgoliaPublicConfig,
	getEffectiveSearchProvider,
	isAlgoliaConfigured,
	resolveAlgoliaIndexName,
} from "./config";
export {
	getOrCreateInsightsUserToken,
	initAlgoliaInsights,
	trackSearchHitClick,
} from "./insights";
export type {
	SearchPageOptions,
	SearchPageResult,
	SearchProviderClient,
	UnifiedSearchHit,
} from "./types";

let cached: SearchProviderClient | null = null;
let cachedName: string | null = null;

/**
 * Returns the active search client for the effective provider.
 * Result is cached for the page lifetime.
 */
export function getSearchClient(): SearchProviderClient {
	const provider = getEffectiveSearchProvider();
	if (cached && cachedName === provider) return cached;

	if (provider === "algolia") {
		const cfg = getAlgoliaPublicConfig();
		if (!cfg) {
			cached = createPagefindClient();
			cachedName = "pagefind";
			return cached;
		}
		cached = createAlgoliaClient(cfg);
		cachedName = "algolia";
		return cached;
	}

	cached = createPagefindClient();
	cachedName = "pagefind";
	return cached;
}
