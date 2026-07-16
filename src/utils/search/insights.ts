import aa from "search-insights";
import { type AlgoliaPublicConfig, getAlgoliaPublicConfig } from "./config";

const USER_TOKEN_KEY = "ember-algolia-user-token";

let initialized = false;

function createAnonymousToken(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateInsightsUserToken(): string {
	if (typeof window === "undefined") return "ssr";
	try {
		const existing = window.localStorage.getItem(USER_TOKEN_KEY);
		if (existing) return existing;
		const token = createAnonymousToken();
		window.localStorage.setItem(USER_TOKEN_KEY, token);
		return token;
	} catch {
		return createAnonymousToken();
	}
}

export function initAlgoliaInsights(
	config?: AlgoliaPublicConfig | null,
): boolean {
	if (typeof window === "undefined") return false;
	const cfg = config ?? getAlgoliaPublicConfig();
	if (!cfg?.insights) return false;
	if (initialized) return true;

	aa("init", {
		appId: cfg.appId,
		apiKey: cfg.searchKey,
		useCookie: false,
	});
	aa("setUserToken", getOrCreateInsightsUserToken());
	initialized = true;
	return true;
}

export function trackSearchHitClick(params: {
	indexName: string;
	objectID: string;
	position: number;
	queryID?: string;
}): void {
	if (!initialized) {
		initAlgoliaInsights();
	}
	if (!initialized) return;

	const { indexName, objectID, position, queryID } = params;
	if (queryID) {
		aa("clickedObjectIDsAfterSearch", {
			eventName: "Hit Clicked",
			index: indexName,
			queryID,
			objectIDs: [objectID],
			positions: [position],
		});
	} else {
		aa("clickedObjectIDs", {
			eventName: "Hit Clicked",
			index: indexName,
			objectIDs: [objectID],
		});
	}
}

export { aa as algoliaInsights };
