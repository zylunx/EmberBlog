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

export let popularTags: string[] = [];

let keyword = "";
let result: UnifiedSearchHit[] = [];
let isSearching = false;
let initialized = false;
let debounceTimer: ReturnType<typeof setTimeout>;
let closeTimer: ReturnType<typeof setTimeout>;
let dialog: HTMLDialogElement;
let searchInput: HTMLInputElement;
let triggerButton: HTMLButtonElement;
let searchError = "";
let searchSequence = 0;
let previousBodyOverflow = "";

const provider = getEffectiveSearchProvider();
const algoliaCfg = provider === "algolia" ? getAlgoliaPublicConfig() : null;

const resetSearch = (): void => {
	window.clearTimeout(debounceTimer);
	searchSequence += 1;
	keyword = "";
	result = [];
	isSearching = false;
	searchError = "";
};

const openSearch = async (): Promise<void> => {
	if (!dialog || dialog.open) return;
	window.clearTimeout(closeTimer);
	previousBodyOverflow = document.body.style.overflow;
	document.body.style.overflow = "hidden";
	dialog.classList.add("is-opening");
	dialog.showModal();
	await tick();
	searchInput?.focus();
	requestAnimationFrame(() => dialog.classList.remove("is-opening"));
};

const finishClose = (): void => {
	if (dialog?.open) dialog.close();
	document.body.style.overflow = previousBodyOverflow;
	resetSearch();
	triggerButton?.focus();
};

const closeSearch = (): void => {
	if (!dialog?.open || dialog.classList.contains("is-closing")) return;

	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		finishClose();
		return;
	}

	dialog.classList.add("is-closing");
	closeTimer = window.setTimeout(() => {
		dialog.classList.remove("is-closing");
		finishClose();
	}, 180);
};

const handleBackdropClick = (event: MouseEvent): void => {
	if (event.target === dialog) closeSearch();
};

const handleDialogCancel = (event: Event): void => {
	event.preventDefault();
	closeSearch();
};

const handleDialogClose = (): void => {
	dialog.classList.remove("is-opening", "is-closing");
	document.body.style.overflow = previousBodyOverflow;
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
	finishClose();
	navigateToPage(hit.url);
};

const search = (value: string): void => {
	window.clearTimeout(debounceTimer);
	const normalizedKeyword = value.trim();
	const sequence = ++searchSequence;

	if (!normalizedKeyword) {
		result = [];
		isSearching = false;
		searchError = "";
		return;
	}

	if (!initialized) return;
	result = [];
	isSearching = true;
	searchError = "";

	debounceTimer = window.setTimeout(async () => {
		try {
			const client = getSearchClient();
			await client.ready();
			const searchResults = await client.search(normalizedKeyword, {
				limit: 20,
			});
			if (sequence === searchSequence) result = searchResults;
		} catch (error) {
			if (sequence !== searchSequence) return;
			console.error("Search error:", error);
			result = [];
			searchError =
				provider === "algolia"
					? i18n(I18nKey.searchError)
					: i18n(I18nKey.searchNoResults);
		} finally {
			if (sequence === searchSequence) isSearching = false;
		}
	}, 300);
};

const searchPopularTag = async (tag: string): Promise<void> => {
	keyword = tag;
	search(tag);
	await tick();
	searchInput?.focus();
};

const openFirstResult = (event: KeyboardEvent): void => {
	if (event.key !== "Enter" || event.isComposing || result.length === 0) return;
	event.preventDefault();
	handleResultClick(event, result[0]);
};

const viewMore = (event: Event): void => {
	event.preventDefault();
	const searchUrl = getSearchUrl(keyword);
	finishClose();
	navigateToPage(searchUrl);
};

onMount(() => {
	const initialize = async () => {
		if (provider === "algolia") initAlgoliaInsights(algoliaCfg);
		const client = getSearchClient();
		await client.ready();
		initialized = true;
		if (keyword) search(keyword);
	};

	initialize();

	return () => {
		window.clearTimeout(debounceTimer);
		window.clearTimeout(closeTimer);
		if (dialog?.open) dialog.close();
		document.body.style.overflow = previousBodyOverflow;
	};
});
</script>

<button
	bind:this={triggerButton}
	type="button"
	on:click={openSearch}
	aria-label={i18n(I18nKey.search)}
	class="btn-plain scale-animation rounded-lg w-11 h-11 active:scale-90 flex items-center justify-center"
>
	<Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<dialog
	bind:this={dialog}
	on:click={handleBackdropClick}
	on:cancel={handleDialogCancel}
	on:close={handleDialogClose}
	aria-labelledby="search-dialog-title"
	class="search-dialog"
>
	<div class="search-dialog__surface">
		<header class="search-dialog__header">
			<h2 id="search-dialog-title">{i18n(I18nKey.search)}</h2>
			<button
				type="button"
				on:click={closeSearch}
				aria-label="关闭"
				class="search-dialog__close btn-plain scale-animation"
			>
				<Icon icon="material-symbols:close-rounded" class="text-[1.5rem]"></Icon>
			</button>
		</header>

		<div class="search-dialog__input-wrap">
			<Icon
				icon="material-symbols:search"
				class="search-dialog__input-icon text-[1.35rem]"
			></Icon>
			<input
				bind:this={searchInput}
				bind:value={keyword}
				on:input={() => search(keyword)}
				on:keydown={openFirstResult}
				placeholder={i18n(I18nKey.searchTypeSomething)}
				aria-label={i18n(I18nKey.search)}
				autocomplete="off"
				class="search-dialog__input"
			>
		</div>

		<div class="search-dialog__content" aria-live="polite">
			{#if !keyword.trim()}
				{#if popularTags.length > 0}
					<div class="search-dialog__tags">
						{#each popularTags as tag}
							<button type="button" on:click={() => searchPopularTag(tag)}>
								{tag}
							</button>
						{/each}
					</div>
				{/if}
			{:else if isSearching}
				<div class="search-dialog__message">{i18n(I18nKey.searchLoading)}</div>
			{:else if searchError}
				<div class="search-dialog__message">{searchError}</div>
			{:else if result.length > 0}
				<div class="search-dialog__results">
					{#each result.slice(0, 5) as item}
						<a href={item.url} on:click={(event) => handleResultClick(event, item)}>
							<div class="search-dialog__result-title">
								<span>{@html item.title}</span>
								<Icon icon="fa7-solid:chevron-right" class="text-[0.7rem]"></Icon>
							</div>
							{#if item.excerpt.includes("<mark>")}
								<div class="search-dialog__excerpt">{@html item.excerpt}</div>
							{/if}
						</a>
					{/each}
					{#if result.length > 5}
						<a href={getSearchUrl(keyword)} on:click={viewMore} class="search-dialog__more">
							{i18n(I18nKey.searchViewMore).replace(
								"{count}",
								(result.length - 5).toString(),
							)}
							<Icon icon="fa7-solid:arrow-right" class="text-[0.7rem]"></Icon>
						</a>
					{/if}
				</div>
			{:else}
				<div class="search-dialog__message">{i18n(I18nKey.searchNoResults)}</div>
			{/if}
		</div>
	</div>
</dialog>

<style>
	.search-dialog {
		width: min(720px, calc(100vw - 32px));
		max-width: none;
		max-height: min(78vh, 720px);
		margin: auto;
		padding: 0;
		border: 0;
		border-radius: 1rem;
		background: transparent;
		color: var(--btn-content);
		overflow: visible;
		opacity: 0;
		transform: translateY(calc(-4vh + 10px)) scale(0.97);
		transition:
			opacity 180ms ease,
			transform 180ms ease;
	}

	.search-dialog[open] {
		opacity: 1;
		transform: translateY(-4vh) scale(1);
	}

	.search-dialog.is-opening,
	.search-dialog.is-closing {
		opacity: 0;
		transform: translateY(calc(-4vh + 10px)) scale(0.97);
	}

	.search-dialog::backdrop {
		background: rgb(255 255 255 / 0.2);
		backdrop-filter: blur(12px);
		animation: search-backdrop-in 180ms ease both;
	}

	.search-dialog.is-closing::backdrop {
		animation: search-backdrop-out 180ms ease both;
	}

	:global(:root.dark) .search-dialog::backdrop {
		background: rgb(0 0 0 / 0.3);
	}

	.search-dialog__surface {
		display: flex;
		max-height: min(78vh, 720px);
		flex-direction: column;
		padding: 1.5rem;
		border: 1px solid color-mix(in srgb, var(--primary) 32%, var(--line-divider));
		border-radius: 1rem;
		background: color-mix(in srgb, var(--card-bg) 94%, transparent);
		box-shadow: 0 24px 70px color-mix(in srgb, var(--primary) 22%, rgb(0 0 0 / 0.16));
		backdrop-filter: blur(24px) saturate(1.2);
	}

	.search-dialog__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}

	.search-dialog__header h2 {
		margin: 0;
		color: var(--primary);
		font-size: 1.75rem;
		font-weight: 800;
		line-height: 1.2;
	}

	.search-dialog__close {
		display: flex;
		width: 2.5rem;
		height: 2.5rem;
		align-items: center;
		justify-content: center;
		border-radius: 0.75rem;
		color: var(--content-meta);
	}

	.search-dialog__input-wrap {
		position: relative;
		flex: none;
	}

	.search-dialog__input-icon {
		position: absolute;
		top: 50%;
		left: 1rem;
		color: var(--primary);
		transform: translateY(-50%);
		pointer-events: none;
	}

	.search-dialog__input {
		width: 100%;
		height: 3.5rem;
		padding: 0 1rem 0 3rem;
		border: 1.5px solid color-mix(in srgb, var(--primary) 72%, var(--line-color));
		border-radius: 1rem;
		background: color-mix(in srgb, var(--primary) 4%, transparent);
		color: var(--btn-content);
		font-size: 1rem;
		outline: none;
		transition:
			border-color 160ms ease,
			box-shadow 160ms ease,
			background-color 160ms ease;
	}

	.search-dialog__input::placeholder {
		color: var(--content-meta);
		opacity: 0.72;
	}

	.search-dialog__input:focus {
		border-color: var(--primary);
		background: color-mix(in srgb, var(--primary) 7%, transparent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
	}

	.search-dialog__content {
		min-height: 2.5rem;
		overflow-y: auto;
	}

	.search-dialog__tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.625rem;
		padding-top: 1.25rem;
	}

	.search-dialog__tags button {
		padding: 0.4rem 0.75rem;
		border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--line-divider));
		border-radius: 0.65rem;
		background: color-mix(in srgb, var(--primary) 6%, transparent);
		color: var(--btn-content);
		font-size: 0.95rem;
		line-height: 1.2;
		cursor: pointer;
		transition:
			color 160ms ease,
			border-color 160ms ease,
			background-color 160ms ease,
			transform 160ms ease;
	}

	.search-dialog__tags button:hover,
	.search-dialog__tags button:focus-visible {
		border-color: var(--primary);
		background: color-mix(in srgb, var(--primary) 14%, transparent);
		color: var(--primary);
		outline: none;
		transform: translateY(-1px);
	}

	.search-dialog__message {
		padding: 1rem 0.25rem 0;
		color: var(--content-meta);
		font-size: 0.95rem;
	}

	.search-dialog__results {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding-top: 1rem;
	}

	.search-dialog__results > a {
		display: block;
		padding: 0.75rem;
		border-radius: 0.75rem;
		transition: background-color 160ms ease;
	}

	.search-dialog__results > a:hover,
	.search-dialog__results > a:focus-visible {
		background: color-mix(in srgb, var(--primary) 10%, transparent);
		outline: none;
	}

	.search-dialog__result-title {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--btn-content);
		font-weight: 700;
	}

	.search-dialog__results > a:hover .search-dialog__result-title,
	.search-dialog__results > a:focus-visible .search-dialog__result-title {
		color: var(--primary);
	}

	.search-dialog__excerpt {
		margin-top: 0.2rem;
		color: var(--content-meta);
		font-size: 0.875rem;
	}

	.search-dialog__more {
		display: flex !important;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		color: var(--primary);
		font-weight: 700;
	}

	:global(.search-dialog mark) {
		padding: 0 0.1em;
		background: transparent;
		color: var(--primary);
		font-weight: 600;
	}

	@keyframes search-backdrop-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes search-backdrop-out {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}

	@media (max-width: 640px) {
		.search-dialog {
			max-height: calc(100vh - 32px);
			transform: translateY(4px) scale(0.97);
		}

		.search-dialog[open] {
			transform: translateY(0) scale(1);
		}

		.search-dialog.is-opening,
		.search-dialog.is-closing {
			transform: translateY(4px) scale(0.97);
		}

		.search-dialog__surface {
			max-height: calc(100vh - 32px);
			padding: 1.25rem;
		}

		.search-dialog__header {
			margin-bottom: 1rem;
		}

		.search-dialog__header h2 {
			font-size: 1.5rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.search-dialog,
		.search-dialog::backdrop {
			animation: none;
			transition: none;
		}
	}
</style>
