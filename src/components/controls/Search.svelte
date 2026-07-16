<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { navigateToPage } from "@utils/navigation-utils";
import { onMount, tick } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import {
	getAlgoliaPublicConfig,
	getEffectiveSearchProvider,
	getSearchClient,
	initAlgoliaInsights,
	trackSearchHitClick,
	type UnifiedSearchHit,
} from "@/utils/search";
import { getSearchUrl } from "@/utils/url-utils";

// --- State ---
let keywordDesktop = "";
let keywordMobile = "";
let result: UnifiedSearchHit[] = [];
let isSearching = false;
let initialized = false;
let debounceTimer: ReturnType<typeof setTimeout>;
let isDesktopSearchOpen = false;
let desktopInput: HTMLInputElement;
let desktopSearchCloseTimer: number;
let searchError = "";

const provider = getEffectiveSearchProvider();
const algoliaCfg = provider === "algolia" ? getAlgoliaPublicConfig() : null;

// --- UI Logic ---
const togglePanel = () => {
	document
		.getElementById("search-panel")
		?.classList.toggle("float-panel-closed");
};

const expandDesktopSearch = (): void => {
	window.clearTimeout(desktopSearchCloseTimer);
	isDesktopSearchOpen = true;
};

const focusDesktopSearch = async (): Promise<void> => {
	expandDesktopSearch();
	await tick();
	desktopInput?.focus();
	search(keywordDesktop, true);
};

const closeDesktopSearch = (): void => {
	if (keywordDesktop || document.activeElement === desktopInput) return;
	isDesktopSearchOpen = false;
	document.getElementById("search-panel")?.classList.add("float-panel-closed");
};

const scheduleDesktopSearchClose = (): void => {
	window.clearTimeout(desktopSearchCloseTimer);
	desktopSearchCloseTimer = window.setTimeout(closeDesktopSearch, 180);
};

const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
	const panel = document.getElementById("search-panel");
	if (
		!panel ||
		(isDesktop && !keywordDesktop) ||
		(!isDesktop && !keywordMobile)
	)
		return;
	show
		? panel.classList.remove("float-panel-closed")
		: panel.classList.add("float-panel-closed");
};

const closeSearchPanel = (): void => {
	document.getElementById("search-panel")?.classList.add("float-panel-closed");
	keywordDesktop = "";
	keywordMobile = "";
	isDesktopSearchOpen = false;
	result = [];
	searchError = "";
};

const handleResultClick = (event: Event, hit: UnifiedSearchHit): void => {
	event.preventDefault();
	if (provider === "algolia" && algoliaCfg) {
		trackSearchHitClick({
			indexName: algoliaCfg.indexName,
			objectID: hit.objectID,
			position: hit.position ?? 1,
			queryID: hit.queryID,
		});
	}
	closeSearchPanel();
	navigateToPage(hit.url);
};

// --- Core Search Logic ---
const search = async (keyword: string, isDesktop: boolean): Promise<void> => {
	if (!keyword) {
		setPanelVisibility(false, isDesktop);
		result = [];
		searchError = "";
		return;
	}
	if (!initialized) return;

	isSearching = true;
	searchError = "";

	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		try {
			const client = getSearchClient();
			await client.ready();
			const searchResults = await client.search(keyword, { limit: 20 });
			result = searchResults;
			setPanelVisibility(true, isDesktop);
		} catch (error) {
			console.error("Search error:", error);
			result = [];
			searchError =
				provider === "algolia"
					? i18n(I18nKey.searchError)
					: i18n(I18nKey.searchNoResults);
			setPanelVisibility(true, isDesktop);
		} finally {
			isSearching = false;
		}
	}, 300);
};

// --- Initialization onMount ---
onMount(() => {
	const initialize = async () => {
		if (provider === "algolia") {
			initAlgoliaInsights(algoliaCfg);
		}
		const client = getSearchClient();
		await client.ready();
		initialized = true;
		if (keywordDesktop) search(keywordDesktop, true);
		if (keywordMobile) search(keywordMobile, false);
	};

	initialize();
});

// --- Reactive Statements ---
$: if (initialized && (keywordDesktop || keywordDesktop === "")) {
	search(keywordDesktop, true);
}
$: if (initialized && (keywordMobile || keywordMobile === "")) {
	search(keywordMobile, false);
}
</script>

<!-- search bar for desktop view -->
<div id="search-bar" class="hidden lg:flex relative items-center h-11 mr-2 rounded-lg overflow-hidden
      transition-[width,background-color,box-shadow] duration-300 ease-out
      {isDesktopSearchOpen
          ? 'w-60 bg-black/4 hover:bg-black/6 focus-within:bg-black/6 dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10'
          : 'w-11 bg-transparent'}
" on:mouseenter={expandDesktopSearch} on:mouseleave={scheduleDesktopSearchClose}>
    <input
        bind:this={desktopInput}
        placeholder={i18n(I18nKey.search)}
        bind:value={keywordDesktop}
        on:focus={() => {
            isDesktopSearchOpen = true;
            search(keywordDesktop, true);
        }}
        on:blur={scheduleDesktopSearchClose}
        class="absolute right-11 h-full bg-transparent outline-0 text-sm
               text-black/50 dark:text-white/50
               transition-[width,opacity,padding] duration-300 ease-out
               {isDesktopSearchOpen
                   ? 'w-[12.25rem] opacity-100 pl-3 pr-2'
                   : 'w-0 opacity-0 pl-0 pr-0 pointer-events-none'}"
    >
    <button
        type="button"
        on:click={focusDesktopSearch}
        aria-label={i18n(I18nKey.search)}
        class="btn-plain scale-animation absolute right-0 top-0 z-10 rounded-lg w-11 h-11 active:scale-90 flex items-center justify-center"
    >
        <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
    </button>
</div>

<!-- toggle btn for phone/tablet view -->
<button on:click={togglePanel} aria-label="Search Panel" id="search-switch"
        class="btn-plain scale-animation lg:hidden! rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed search-panel absolute md:w-120
top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2">

    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/4 hover:bg-black/6 focus-within:bg-black/6
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  ">
        <Icon icon="material-symbols:search"
              class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
        <input placeholder={i18n(I18nKey.search)} bind:value={keywordMobile}
               class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               focus:w-60 text-black/50 dark:text-white/50"
        >
    </div>

    <!-- search results -->
    {#if isSearching}
        <div class="transition first-of-type:mt-2 lg:first-of-type:mt-0 block rounded-xl text-lg px-3 py-2 text-50">
            {i18n(I18nKey.searchLoading)}
        </div>
    {:else if searchError}
        <div class="transition first-of-type:mt-2 lg:first-of-type:mt-0 block rounded-xl text-lg px-3 py-2 text-50">
            {searchError}
        </div>
    {:else if result.length > 0}
        {#each result.slice(0, 5) as item}
            <a href={item.url}
               on:click={(e) => handleResultClick(e, item)}
               class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
           rounded-xl text-lg px-3 py-2 hover:bg-(--btn-plain-bg-hover) active:bg-(--btn-plain-bg-active)">
                <div class="transition text-90 inline-flex font-bold group-hover:text-(--primary)">
                    {@html item.title}
                    <Icon icon="fa7-solid:chevron-right"
                          class="transition text-[0.75rem] translate-x-1 my-auto text-(--primary)"></Icon>
                </div>
                {#if item.excerpt.includes('<mark>')}
                    <div class="transition text-sm text-50" style="display: flex; align-items: flex-start; margin-top: 0.1rem">
                        <div>
                            {@html item.excerpt}
                        </div>
                    </div>
                {/if}
            </a>
        {/each}
        {#if result.length > 5}
            <a href={getSearchUrl(keywordDesktop || keywordMobile)}
               on:click={(e) => {
                   e.preventDefault();
                   const url = getSearchUrl(keywordDesktop || keywordMobile);
                   closeSearchPanel();
                   navigateToPage(url);
               }}
               class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block rounded-xl text-lg px-3 py-2 hover:bg-(--btn-plain-bg-hover) active:bg-(--btn-plain-bg-active) text-(--primary) font-bold text-center">
                <span class="inline-flex items-center">
                    {i18n(I18nKey.searchViewMore).replace('{count}', (result.length - 5).toString())}
                    <Icon icon="fa7-solid:arrow-right" class="transition text-[0.75rem] ml-1"></Icon>
                </span>
            </a>
        {/if}
    {:else if keywordDesktop || keywordMobile}
        <div class="transition first-of-type:mt-2 lg:first-of-type:mt-0 block rounded-xl text-lg px-3 py-2 text-50">
            {i18n(I18nKey.searchNoResults)}
        </div>
    {:else}
        <div class="transition first-of-type:mt-2 lg:first-of-type:mt-0 block rounded-xl text-lg px-3 py-2 text-50">
            {i18n(I18nKey.searchTypeSomething)}
        </div>
    {/if}
</div>

<style>
    input:focus {
        outline: 0;
    }

    .search-panel {
        max-height: calc(100vh - 100px);
        overflow-y: auto;
    }

    :global(.search-panel mark) {
        background: transparent;
        color: var(--primary);
        font-weight: 600;
        padding: 0 0.1em;
    }
</style>
