import { searchConfig } from "@/config/searchConfig";
import type { SearchProvider } from "@/types/searchConfig";

export type AlgoliaPublicConfig = {
	appId: string;
	searchKey: string;
	indexName: string;
	dateIndexName: string;
	insights: boolean;
	hitsPerPage: number;
};

function readEnv(name: string): string {
	// Vite / Astro client + Node scripts
	const metaEnv =
		typeof import.meta !== "undefined" && import.meta.env
			? (import.meta.env as Record<string, string | boolean | undefined>)
			: undefined;
	const fromMeta = metaEnv?.[name];
	if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
	if (typeof process !== "undefined" && process.env?.[name]?.trim()) {
		return process.env[name]?.trim() || "";
	}
	return "";
}

/** Resolve which index name to use (dev vs prod). */
export function resolveAlgoliaIndexName(
	env: "dev" | "prod" | "auto" = "auto",
): string {
	const override = readEnv("PUBLIC_ALGOLIA_INDEX");
	if (override) return override;

	let target: "dev" | "prod";
	if (env === "auto") {
		const indexEnv = readEnv("ALGOLIA_INDEX_ENV").toLowerCase();
		if (indexEnv === "prod" || indexEnv === "production") {
			target = "prod";
		} else if (indexEnv === "dev" || indexEnv === "development") {
			target = "dev";
		} else {
			const isProd =
				(typeof import.meta !== "undefined" &&
					import.meta.env &&
					Boolean(import.meta.env.PROD)) ||
				readEnv("NODE_ENV") === "production";
			target = isProd ? "prod" : "dev";
		}
	} else {
		target = env;
	}

	return target === "prod"
		? searchConfig.algolia.indexName.prod
		: searchConfig.algolia.indexName.dev;
}

export function getAlgoliaPublicConfig(
	env: "dev" | "prod" | "auto" = "auto",
): AlgoliaPublicConfig | null {
	const appId = readEnv("PUBLIC_ALGOLIA_APP_ID") || searchConfig.algolia.appId;
	const searchKey = readEnv("PUBLIC_ALGOLIA_SEARCH_KEY");
	const indexName = resolveAlgoliaIndexName(env);

	if (!appId || !searchKey || !indexName) return null;

	return {
		appId,
		searchKey,
		indexName,
		dateIndexName: `${indexName}_date_desc`,
		insights: searchConfig.algolia.insights,
		hitsPerPage: searchConfig.algolia.hitsPerPage ?? 10,
	};
}

/**
 * Effective provider after applying fallback rules.
 * Incomplete Algolia public config → Pagefind.
 */
export function getEffectiveSearchProvider(
	env: "dev" | "prod" | "auto" = "auto",
): SearchProvider {
	if (searchConfig.provider !== "algolia") return "pagefind";
	const algolia = getAlgoliaPublicConfig(env);
	if (!algolia) return "pagefind";
	return "algolia";
}

export function isAlgoliaConfigured(
	env: "dev" | "prod" | "auto" = "auto",
): boolean {
	return getAlgoliaPublicConfig(env) !== null;
}
