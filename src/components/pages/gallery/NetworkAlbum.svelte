<script lang="ts">
import { tick } from "svelte";
import Icon from "@/components/common/Icon.svelte";

type NetworkPhoto = {
	id?: string | number;
	link: string;
};

type Labels = {
	category: string;
	quantity: string;
	randomFetch: string;
	fetching: string;
	fetchError: string;
	noImages: string;
};

type NetworkCategory = {
	value: string;
	label: string;
};

interface Props {
	apiUrl?: string;
	categories?: NetworkCategory[];
	defaultCategory?: string;
	maxQuantity?: number;
	defaultQuantity?: number;
	cooldownSeconds?: number;
	labels: Labels;
}

const fallbackCategories = [
	{ value: "pc", label: "PC" },
	{ value: "ai", label: "AI" },
	{ value: "aimp", label: "AI MP" },
	{ value: "bd", label: "BD" },
	{ value: "fj", label: "FJ" },
	{ value: "fjmp", label: "FJ MP" },
	{ value: "lai", label: "LAI" },
	{ value: "moe", label: "Moe" },
	{ value: "moemp", label: "Moe MP" },
	{ value: "mp", label: "MP" },
	{ value: "tx", label: "TX" },
	{ value: "xhl", label: "XHL" },
	{ value: "ys", label: "YS" },
	{ value: "ysmp", label: "YS MP" },
];

let {
	apiUrl = "https://t.alcy.cc/json",
	categories = fallbackCategories,
	defaultCategory = "pc",
	maxQuantity = 10,
	defaultQuantity = 6,
	cooldownSeconds = 5,
	labels,
}: Props = $props();
const safeMaxQuantity = $derived(Math.max(1, maxQuantity));
let category = $state(defaultCategory);
let quantity = $state(Math.min(Math.max(1, defaultQuantity), safeMaxQuantity));
let photos = $state<NetworkPhoto[]>([]);
let isLoading = $state(false);
let error = $state("");
let cooldown = $state(0);
let cooldownTimer: ReturnType<typeof window.setInterval> | undefined;

const canFetch = $derived(!isLoading && cooldown === 0);
const buttonText = $derived(
	isLoading
		? labels.fetching
		: cooldown > 0
			? `${labels.randomFetch} (${cooldown}s)`
			: labels.randomFetch,
);

function clampQuantity(value: number) {
	quantity = Math.min(
		Math.max(1, Number.isNaN(value) ? 1 : value),
		safeMaxQuantity,
	);
}

function startCooldown() {
	cooldown = Math.max(0, cooldownSeconds);
	if (cooldown === 0) return;
	if (cooldownTimer) window.clearInterval(cooldownTimer);
	cooldownTimer = window.setInterval(() => {
		cooldown -= 1;
		if (cooldown <= 0 && cooldownTimer) {
			window.clearInterval(cooldownTimer);
			cooldownTimer = undefined;
		}
	}, 1000);
}

async function fetchPhotos() {
	if (!canFetch) return;
	isLoading = true;
	error = "";

	try {
		const requestUrl = new URL(apiUrl);
		requestUrl.searchParams.set(category, String(quantity));
		const response = await fetch(requestUrl);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const result = await response.json();
		if (result?.code !== 200 || !Array.isArray(result.data)) {
			throw new Error("Unexpected response");
		}
		photos = result.data
			.map((item: { id?: string | number; link?: string }) => ({
				id: item.id,
				link: item.link || "",
			}))
			.filter((item: NetworkPhoto) => item.link);
		startCooldown();
		await tick();
		document.dispatchEvent(new CustomEvent("gallery:network-loaded"));
	} catch {
		error = labels.fetchError;
	} finally {
		isLoading = false;
	}
}

$effect(() => {
	return () => {
		if (cooldownTimer) window.clearInterval(cooldownTimer);
	};
});
</script>

<div class="gallery-network">
	<div class="gallery-network-toolbar">
		<label class="gallery-network-field">
			<span>{labels.category}</span>
			<select bind:value={category}>
				{#each categories as item}
					<option value={item.value}>{item.label}</option>
				{/each}
			</select>
		</label>

		<label class="gallery-network-field">
			<span>{labels.quantity}</span>
			<input
				type="number"
				min="1"
				max={safeMaxQuantity}
				value={quantity}
				oninput={(event) =>
					clampQuantity(Number((event.currentTarget as HTMLInputElement).value))}
			/>
		</label>

		<button type="button" class="gallery-network-fetch btn-regular" disabled={!canFetch} onclick={fetchPhotos}>
			<Icon icon={isLoading ? "svg-spinners:180-ring" : "material-symbols:shuffle"} size="lg" />
			<span>{buttonText}</span>
		</button>
	</div>

	{#if error}
		<div class="gallery-network-error" role="alert">{error}</div>
	{/if}

	{#if photos.length > 0}
		<div class="gallery-network-grid">
			{#each photos as photo, index}
				<a
					href={photo.link}
					data-fancybox="network-gallery"
					data-src={photo.link}
					data-type="image"
					class="gallery-network-item"
				>
					<img src={photo.link} alt={`Network gallery ${index + 1}`} loading="lazy" decoding="async" />
					<span aria-hidden="true">
						<Icon icon="material-symbols:zoom-in" size="2xl" />
					</span>
				</a>
			{/each}
		</div>
	{:else if !isLoading}
		<div class="gallery-network-empty">
			<Icon icon="material-symbols:add-photo-alternate-outline" size="2xl" />
			<p>{labels.noImages}</p>
		</div>
	{/if}
</div>
