<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { liteClient as algoliasearch } from "algoliasearch/lite";
import instantsearch from "instantsearch.js";
import { history as historyRouter } from "instantsearch.js/es/lib/routers";
import {
	configure,
	hits,
	pagination,
	panel,
	refinementList,
	searchBox,
	sortBy,
	stats,
} from "instantsearch.js/es/widgets";
import { onDestroy, onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import {
	getAlgoliaPublicConfig,
	getEffectiveSearchProvider,
	getSearchClient,
	initAlgoliaInsights,
	trackSearchHitClick,
	type UnifiedSearchHit,
} from "@/utils/search";

// --- Props ---
export let title = i18n(I18nKey.search);
export let description = "";

const provider = getEffectiveSearchProvider();
const algoliaCfg = provider === "algolia" ? getAlgoliaPublicConfig() : null;

// --- Pagefind / unified state ---
let keyword = "";
let results: UnifiedSearchHit[] = [];
let isSearching = false;
let initialized = false;
let searchError = "";
let debounceTimer: ReturnType<typeof setTimeout>;

// InstantSearch containers (bound)
let searchRoot: HTMLElement;
let searchInstance: ReturnType<typeof instantsearch> | null = null;

const getInitialKeyword = (): string => {
	if (typeof window !== "undefined") {
		return new URLSearchParams(window.location.search).get("q") || "";
	}
	return "";
};

const runPagefindSearch = async () => {
	if (!initialized || !keyword.trim()) {
		results = [];
		return;
	}
	isSearching = true;
	searchError = "";
	try {
		const client = getSearchClient();
		await client.ready();
		results = await client.search(keyword);
	} catch (error) {
		console.error("Search error:", error);
		results = [];
		searchError = i18n(I18nKey.searchError);
	} finally {
		isSearching = false;
	}
};

const handleInput = () => {
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		runPagefindSearch();
	}, 300);
};

const handlePagefindResultClick = (_hit: UnifiedSearchHit) => {
	// pagefind path has no Insights
};

function mountInstantSearch() {
	if (!algoliaCfg || !searchRoot) return;

	initAlgoliaInsights(algoliaCfg);

	const searchClient = algoliasearch(algoliaCfg.appId, algoliaCfg.searchKey);
	const initialQuery = getInitialKeyword();

	searchInstance = instantsearch({
		indexName: algoliaCfg.indexName,
		searchClient,
		insights: algoliaCfg.insights,
		initialUiState: {
			[algoliaCfg.indexName]: {
				query: initialQuery,
			},
		},
		routing: {
			router: historyRouter({
				cleanUrlOnDispose: false,
				createURL({ routeState, location }) {
					const indexState =
						(routeState[algoliaCfg.indexName] as Record<string, unknown>) || {};
					const query = (indexState.query as string) || "";
					const url = new URL(location.href);
					if (query) url.searchParams.set("q", query);
					else url.searchParams.delete("q");
					// Keep other InstantSearch state out of the pretty URL for simplicity
					return `${url.pathname}${url.search}${url.hash}`;
				},
				parseURL({ location }) {
					const q = new URLSearchParams(location.search).get("q") || "";
					return {
						[algoliaCfg.indexName]: {
							query: q,
						},
					};
				},
			}),
		},
	});

	const tagsPanel = panel({
		templates: {
			header: i18n(I18nKey.tags),
		},
	})(refinementList);

	const categoriesPanel = panel({
		templates: {
			header: i18n(I18nKey.categories),
		},
	})(refinementList);

	searchInstance.addWidgets([
		configure({
			hitsPerPage: algoliaCfg.hitsPerPage,
			attributesToSnippet: ["content:20", "description:20"],
			attributesToHighlight: ["title", "description", "content"],
			highlightPreTag: "<mark>",
			highlightPostTag: "</mark>",
			clickAnalytics: true,
			// Same-type OR is default for facetFilters from refinementList
			// Cross-facet AND is InstantSearch default
		}),
		searchBox({
			container: searchRoot.querySelector(".ais-searchbox") as HTMLElement,
			placeholder: i18n(I18nKey.search),
			showReset: true,
			showSubmit: false,
			showLoadingIndicator: true,
			cssClasses: {
				root: "ais-SearchBox-root",
				form: "ais-SearchBox-form",
				input: "ais-SearchBox-input",
			},
		}),
		stats({
			container: searchRoot.querySelector(".ais-stats") as HTMLElement,
			templates: {
				text(data, { html }) {
					if (data.hasManyResults) {
						return html`<span>${data.nbHits} results</span>`;
					}
					if (data.hasOneResult) {
						return html`<span>1 result</span>`;
					}
					if (data.hasNoResults) {
						return html`<span>${i18n(I18nKey.searchNoResults)}</span>`;
					}
					return html`<span>${i18n(I18nKey.searchTypeSomething)}</span>`;
				},
			},
		}),
		sortBy({
			container: searchRoot.querySelector(".ais-sort") as HTMLElement,
			items: [
				{
					label: i18n(I18nKey.searchSortRelevance),
					value: algoliaCfg.indexName,
				},
				{
					label: i18n(I18nKey.searchSortDate),
					value: algoliaCfg.dateIndexName,
				},
			],
			cssClasses: {
				select: "ais-SortBy-select",
			},
		}),
		categoriesPanel({
			container: searchRoot.querySelector(
				".ais-facet-categories",
			) as HTMLElement,
			attribute: "categories",
			operator: "or",
			limit: 20,
			cssClasses: {
				list: "ais-RefinementList-list",
				item: "ais-RefinementList-item",
				selectedItem: "ais-RefinementList-item--selected",
				label: "ais-RefinementList-label",
				count: "ais-RefinementList-count",
			},
		}),
		tagsPanel({
			container: searchRoot.querySelector(".ais-facet-tags") as HTMLElement,
			attribute: "tags",
			operator: "or",
			limit: 30,
			showMore: true,
			cssClasses: {
				list: "ais-RefinementList-list",
				item: "ais-RefinementList-item",
				selectedItem: "ais-RefinementList-item--selected",
				label: "ais-RefinementList-label",
				count: "ais-RefinementList-count",
			},
		}),
		hits({
			container: searchRoot.querySelector(".ais-hits") as HTMLElement,
			templates: {
				item(hit, { html, components }) {
					const url = (hit as { url?: string }).url || "#";
					const objectID = (hit as { objectID: string }).objectID;
					return html`<a
						href="${url}"
						class="ais-hit-card"
						data-object-id="${objectID}"
						data-position="${(hit as { __position?: number }).__position ?? 1}"
						data-query-id="${(hit as { __queryID?: string }).__queryID ?? ""}"
					>
						<h3 class="ais-hit-title">
							${components.Highlight({ hit, attribute: "title" })}
						</h3>
						<p class="ais-hit-excerpt">
							${components.Snippet({ hit, attribute: "content" })}
						</p>
					</a>`;
				},
				empty(results, { html }) {
					if (!results.query) {
						return html`<div class="ais-empty">
							${i18n(I18nKey.searchTypeSomething)}
						</div>`;
					}
					return html`<div class="ais-empty">
						${i18n(I18nKey.searchNoResults)}
					</div>`;
				},
			},
		}),
		pagination({
			container: searchRoot.querySelector(".ais-pagination") as HTMLElement,
			padding: 2,
			showFirst: false,
			showLast: false,
		}),
	]);

	// Capture clicks for Insights (in addition to built-in insights:true)
	searchRoot.addEventListener("click", (event) => {
		const target = event.target as HTMLElement | null;
		const card = target?.closest?.(".ais-hit-card") as HTMLElement | null;
		if (!card || !algoliaCfg) return;
		const objectID = card.dataset.objectId;
		const position = Number(card.dataset.position || "1");
		const queryID = card.dataset.queryId || undefined;
		if (objectID) {
			trackSearchHitClick({
				indexName: algoliaCfg.indexName,
				objectID,
				position,
				queryID,
			});
		}
	});

	searchInstance.start();
}

onMount(() => {
	if (provider === "algolia" && algoliaCfg) {
		// Defer so bind:this containers exist
		requestAnimationFrame(() => {
			try {
				mountInstantSearch();
			} catch (error) {
				console.error("InstantSearch init failed:", error);
				searchError = i18n(I18nKey.searchError);
			}
		});
		return;
	}

	// Pagefind path
	const initialize = async () => {
		initialized = true;
		const initialKeyword = getInitialKeyword();
		if (initialKeyword) {
			keyword = initialKeyword;
			await runPagefindSearch();
		}
	};

	if (import.meta.env.DEV) {
		initialize();
	} else if (window.pagefind) {
		initialize();
	} else {
		document.addEventListener("pagefindready", initialize, { once: true });
		document.addEventListener("pagefindloaderror", initialize, {
			once: true,
		});
		// If pagefind never loads, still allow UI
		window.setTimeout(() => {
			if (!initialized) initialize();
		}, 2000);
	}
});

onDestroy(() => {
	searchInstance?.dispose();
	searchInstance = null;
	clearTimeout(debounceTimer);
});
</script>

<div class="card-base px-6 py-6 md:px-9 md:py-6 mb-4 rounded-(--radius-large)">
    <div class="mb-4">
        <div class="flex items-center gap-3 mb-3">
            <div class="h-8 w-8 rounded-lg bg-(--primary) flex items-center justify-center text-white dark:text-black/70">
                <Icon icon="material-symbols:search" class="text-[1.5rem]"></Icon>
            </div>
            <div class="text-3xl font-bold text-90">
                {title}
            </div>
        </div>
        {#if description}
            <p class="text-base text-50 leading-relaxed">
                {description}
            </p>
        {/if}
    </div>

    {#if provider === "algolia" && algoliaCfg}
        <div class="ember-instantsearch" bind:this={searchRoot}>
            <div class="ais-searchbox"></div>
            {#if searchError}
                <div class="mt-4 text-50 text-center">{searchError}</div>
            {/if}
            <div class="ais-toolbar mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div class="ais-stats text-sm text-50"></div>
                <div class="ais-sort"></div>
            </div>
            <div class="ais-layout mt-4 grid grid-cols-1 lg:grid-cols-[14rem_1fr] gap-4">
                <aside class="ais-facets space-y-4">
                    <div class="ais-facet-card card-base p-4 rounded-(--radius-large)">
                        <div class="ais-facet-categories"></div>
                    </div>
                    <div class="ais-facet-card card-base p-4 rounded-(--radius-large)">
                        <div class="ais-facet-tags"></div>
                    </div>
                </aside>
                <div class="ais-main min-w-0">
                    <div class="ais-hits space-y-4"></div>
                    <div class="ais-pagination mt-6 flex justify-center"></div>
                </div>
            </div>
        </div>
    {:else}
        <div class="relative flex">
            <div class="relative flex-1">
                <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Icon icon="material-symbols:search" class="text-2xl text-50" />
                </div>
                <input
                    type="text"
                    class="block w-full p-4 pl-10 text-sm bg-transparent border border-black/10 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-(--primary) focus:border-(--primary) hover:border-black/20 dark:hover:border-white/20 text-75 placeholder:opacity-50 transition-colors outline-hidden"
                    placeholder={i18n(I18nKey.search)}
                    bind:value={keyword}
                    on:input={handleInput}
                >
            </div>
        </div>
    {/if}
</div>

{#if provider !== "algolia"}
<div class="grid grid-cols-1 gap-4">
    <div>
        {#if isSearching}
            <div class="flex justify-center py-10">
                <Icon icon="svg-spinners:ring-resize" class="text-4xl text-(--primary)" />
            </div>
        {:else if searchError}
            <div class="card-base p-10 text-center text-50 rounded-(--radius-large)">
                {searchError}
            </div>
        {:else if results.length > 0}
            <div class="space-y-4">
                {#each results as result}
                    <div class="card-base p-6 block rounded-(--radius-large)">
                        <a href={result.url} class="block group" on:click={() => handlePagefindResultClick(result)}>
                            <h5 class="mb-2 text-2xl font-bold tracking-tight text-90 group-hover:text-(--primary) transition-colors">
                                {@html result.title}
                            </h5>
                            <p class="font-normal text-75">
                                {@html result.excerpt}
                            </p>
                        </a>
                    </div>
                {/each}
            </div>
        {:else if keyword}
            <div class="card-base p-10 text-center text-50 rounded-(--radius-large)">
                {i18n(I18nKey.searchNoResults)}
            </div>
        {:else}
             <div class="card-base p-10 text-center text-50 rounded-(--radius-large)">
                {i18n(I18nKey.searchTypeSomething)}
            </div>
        {/if}
    </div>
</div>
{/if}

<style>
    :global(mark) {
        background: transparent;
        color: var(--primary);
        font-weight: 600;
        padding: 0 0.1em;
    }

    /* InstantSearch theme bridge */
    :global(.ember-instantsearch .ais-SearchBox-form) {
        position: relative;
        display: flex;
        align-items: center;
    }

    :global(.ember-instantsearch .ais-SearchBox-input) {
        width: 100%;
        padding: 1rem 2.5rem 1rem 1rem;
        font-size: 0.875rem;
        background: transparent;
        border: 1px solid color-mix(in oklab, var(--primary) 15%, transparent);
        border-radius: 0.5rem;
        color: inherit;
        outline: none;
    }

    :global(.ember-instantsearch .ais-SearchBox-input:focus) {
        border-color: var(--primary);
        box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary) 25%, transparent);
    }

    :global(.ember-instantsearch .ais-SearchBox-reset),
    :global(.ember-instantsearch .ais-SearchBox-loadingIndicator) {
        position: absolute;
        right: 0.75rem;
    }

    :global(.ember-instantsearch .ais-SortBy-select) {
        background: transparent;
        border: 1px solid color-mix(in oklab, currentColor 15%, transparent);
        border-radius: 0.5rem;
        padding: 0.35rem 0.6rem;
        font-size: 0.875rem;
        color: inherit;
    }

    :global(.ember-instantsearch .ais-Panel-header) {
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: inherit;
        opacity: 0.85;
    }

    :global(.ember-instantsearch .ais-RefinementList-list) {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    :global(.ember-instantsearch .ais-RefinementList-label) {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.875rem;
        cursor: pointer;
    }

    :global(.ember-instantsearch .ais-RefinementList-count) {
        margin-left: auto;
        opacity: 0.5;
        font-size: 0.75rem;
    }

    :global(.ember-instantsearch .ais-RefinementList-item--selected .ais-RefinementList-label) {
        color: var(--primary);
        font-weight: 600;
    }

    :global(.ember-instantsearch .ais-hit-card) {
        display: block;
        padding: 1.25rem 1.5rem;
        border-radius: var(--radius-large);
        background: var(--card-bg, transparent);
        border: 1px solid color-mix(in oklab, currentColor 8%, transparent);
        transition: border-color 0.15s ease;
        text-decoration: none;
        color: inherit;
    }

    :global(.ember-instantsearch .ais-hit-card:hover) {
        border-color: color-mix(in oklab, var(--primary) 40%, transparent);
    }

    :global(.ember-instantsearch .ais-hit-title) {
        margin: 0 0 0.5rem;
        font-size: 1.25rem;
        font-weight: 700;
    }

    :global(.ember-instantsearch .ais-hit-card:hover .ais-hit-title) {
        color: var(--primary);
    }

    :global(.ember-instantsearch .ais-hit-excerpt) {
        margin: 0;
        opacity: 0.75;
        font-size: 0.95rem;
        line-height: 1.5;
    }

    :global(.ember-instantsearch .ais-empty) {
        padding: 2.5rem 1rem;
        text-align: center;
        opacity: 0.55;
    }

    :global(.ember-instantsearch .ais-Pagination-list) {
        display: flex;
        gap: 0.35rem;
        list-style: none;
        padding: 0;
        margin: 0;
        flex-wrap: wrap;
        justify-content: center;
    }

    :global(.ember-instantsearch .ais-Pagination-item) {
        min-width: 2.25rem;
        height: 2.25rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.5rem;
        border: 1px solid color-mix(in oklab, currentColor 12%, transparent);
        font-size: 0.875rem;
    }

    :global(.ember-instantsearch .ais-Pagination-item--selected) {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
    }

    :global(.ember-instantsearch .ais-Pagination-link) {
        display: flex;
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
        padding: 0 0.5rem;
        text-decoration: none;
        color: inherit;
    }
</style>
