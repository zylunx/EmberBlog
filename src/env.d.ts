/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare global {
	interface ImportMetaEnv {
		readonly MEILI_MASTER_KEY: string;
		/** Algolia Application ID (optional override of searchConfig.algolia.appId) */
		readonly PUBLIC_ALGOLIA_APP_ID?: string;
		/** Algolia Search-Only API Key (safe for the browser) */
		readonly PUBLIC_ALGOLIA_SEARCH_KEY?: string;
		/** Optional full index name override */
		readonly PUBLIC_ALGOLIA_INDEX?: string;
		/** Admin API Key — scripts/CI only, never expose to the client */
		readonly ALGOLIA_ADMIN_API_KEY?: string;
		/** Index target for scripts: dev | prod */
		readonly ALGOLIA_INDEX_ENV?: string;
		/** Set to "1" to allow writing the production index */
		readonly ALGOLIA_INDEX_FORCE?: string;
	}

	interface ITOCManager {
		init: () => void;
		cleanup: () => void;
	}

	interface Window {
		SidebarTOC: {
			manager: ITOCManager | null;
		};
		FloatingTOC: {
			btn: HTMLElement | null;
			panel: HTMLElement | null;
			manager: ITOCManager | null;
			isPostPage: () => boolean;
		};
		toggleFloatingTOC: () => void;
		tocInternalNavigation: boolean;
		// swup is defined in global.d.ts
		// biome-ignore lint/suspicious/noExplicitAny: External library without types
		spine: any;
		closeAnnouncement: () => void;
		semifullScrollHandler?: (() => void) | undefined;
		initSemifullScrollDetection?: () => void;
	}
}

export {};
