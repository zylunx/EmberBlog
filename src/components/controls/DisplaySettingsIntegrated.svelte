<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getDefaultHue, getHue, setHue } from "@utils/setting-utils";
import { onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import { siteConfig } from "@/config";

let hue = $state(getHue());
const defaultHue = getDefaultHue();
let currentLayout: "list" | "grid" = $state("list");
const defaultLayout = siteConfig.postListLayout.defaultMode;
const mobileDefaultLayout =
	siteConfig.postListLayout.mobileDefaultMode || defaultLayout;
let mounted = $state(false);
let isSmallScreen = $state(
	typeof window !== "undefined" ? window.innerWidth < 1200 : false,
);
let isMobileWidth = $state(
	typeof window !== "undefined" ? window.innerWidth < 780 : false,
);
let isSwitching = $state(false);

const allowLayoutSwitch = siteConfig.postListLayout.allowSwitch;
let effectiveDefaultLayout = $derived(
	isMobileWidth ? mobileDefaultLayout : defaultLayout,
);
const showThemeColor = !siteConfig.themeColor.fixed;
const hasAnyContent = showThemeColor || allowLayoutSwitch;

function resetHue() {
	hue = getDefaultHue();
	requestAnimationFrame(refreshAllRangeProgress);
}

function resetLayout() {
	currentLayout = effectiveDefaultLayout;
	localStorage.removeItem("postListLayout");

	window.dispatchEvent(
		new CustomEvent("layoutChange", {
			detail: { layout: effectiveDefaultLayout },
		}),
	);
}

function checkScreenSize() {
	isSmallScreen = window.innerWidth < 1200;
	isMobileWidth = window.innerWidth < 780;
	if (window.innerWidth < 380 && currentLayout === "list") {
		currentLayout = "grid";
		window.dispatchEvent(
			new CustomEvent("layoutChange", {
				detail: { layout: "grid" },
			}),
		);
	}
}

function updateRangeProgress(input: HTMLInputElement) {
	const min = Number(input.min || 0);
	const max = Number(input.max || 100);
	const value = Number(input.value || 0);
	const progress = ((value - min) * 100) / (max - min || 1);
	input.style.setProperty(
		"--range-progress",
		`${Math.min(100, Math.max(0, progress))}%`,
	);
}

function refreshAllRangeProgress() {
	const panel = document.getElementById("display-setting");
	if (!panel) return;

	const rangeInputs = Array.from(
		panel.querySelectorAll('input[type="range"]'),
	) as HTMLInputElement[];

	rangeInputs.forEach((input) => {
		updateRangeProgress(input);
	});
}

function switchLayout() {
	if (!mounted || isSwitching) return;

	isSwitching = true;
	currentLayout = currentLayout === "list" ? "grid" : "list";
	localStorage.setItem("postListLayout", currentLayout);

	window.dispatchEvent(
		new CustomEvent("layoutChange", {
			detail: { layout: currentLayout },
		}),
	);

	setTimeout(() => {
		isSwitching = false;
	}, 500);
}

onMount(() => {
	mounted = true;
	checkScreenSize();

	const savedLayout = localStorage.getItem("postListLayout");
	if (savedLayout && (savedLayout === "list" || savedLayout === "grid")) {
		currentLayout = savedLayout;
	} else {
		currentLayout =
			window.innerWidth < 780 ? mobileDefaultLayout : defaultLayout;
	}

	window.addEventListener("resize", checkScreenSize);

	return () => {
		window.removeEventListener("resize", checkScreenSize);
	};
});

onMount(() => {
	const handleCustomEvent = (event: Event) => {
		const customEvent = event as CustomEvent<{ layout: "list" | "grid" }>;
		currentLayout = customEvent.detail.layout;
	};

	window.addEventListener("layoutChange", handleCustomEvent);

	return () => {
		window.removeEventListener("layoutChange", handleCustomEvent);
	};
});

onMount(() => {
	const panel = document.getElementById("display-setting");
	if (!panel) return;

	const handleRangeInput = (event: Event) => {
		const target = event.target;
		if (target instanceof HTMLInputElement && target.type === "range") {
			updateRangeProgress(target);
		}
	};

	refreshAllRangeProgress();
	panel.addEventListener("input", handleRangeInput);

	return () => {
		panel.removeEventListener("input", handleRangeInput);
	};
});

$effect(() => {
	if (hue || hue === 0) {
		setHue(hue);
	}
});
</script>

{#if hasAnyContent}
<div id="display-setting" class="float-panel float-panel-closed absolute z-[60] right-4 w-[calc(100vw-2rem)] max-w-80 max-h-[calc(100dvh-6rem)] overflow-y-auto origin-top-right px-4 py-2 transition-all">
    {#if showThemeColor}
    <div class="mt-2 mb-2">
        <div class="flex flex-row gap-2 mb-2 items-center justify-between">
            <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3
                before:w-1 before:h-4 before:rounded-md before:bg-(--primary)
                before:absolute before:-left-3 before:top-1/2 before:-translate-y-1/2"
            >
                {i18n(I18nKey.themeColor)}
                <button aria-label="Reset to Default" class="btn-regular w-7 h-7 rounded-md active:scale-90"
                        class:opacity-0={hue === defaultHue} class:pointer-events-none={hue === defaultHue} onclick={resetHue}>
                    <div class="text-(--btn-content)">
                        <Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.875rem]"></Icon>
                    </div>
                </button>
            </div>
            <div class="flex gap-1">
                <div id="hueValue" class="transition bg-(--btn-regular-bg) w-10 h-7 rounded-md flex justify-center
                font-bold text-sm items-center text-(--btn-content)">
                    {hue}
                </div>
            </div>
        </div>
        <div class="w-full h-6 px-1 bg-[oklch(0.80_0.10_0)] dark:bg-[oklch(0.70_0.10_0)] rounded select-none">
            <input aria-label={i18n(I18nKey.themeColor)} type="range" min="0" max="360" bind:value={hue}
                   class="slider" id="colorSlider" step="5" style="width: 100%">
        </div>
    </div>
    {/if}

    {#if allowLayoutSwitch}
        <div class="mt-2 mb-2">
            <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3 mb-2
                before:w-1 before:h-4 before:rounded-md before:bg-(--primary)
                before:absolute before:-left-3 before:top-1/2 before:-translate-y-1/2"
            >
                {i18n(I18nKey.layout)}
                <button aria-label="Reset to Default" class="btn-regular w-7 h-7 rounded-md active:scale-90"
                        class:opacity-0={currentLayout === effectiveDefaultLayout} class:pointer-events-none={currentLayout === effectiveDefaultLayout} onclick={resetLayout}>
                    <div class="text-(--btn-content)">
                        <Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.875rem]"></Icon>
                    </div>
                </button>
            </div>
            <div class="flex gap-2">
                <button
                    class="flex-1 btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
                    class:opacity-60={currentLayout !== "list"}
                    class:bg-(--btn-regular-bg-hover)={currentLayout === "list"}
                    class:hidden={isSmallScreen}
                    onclick={switchLayout}
                    disabled={currentLayout === "list" || isSwitching}
                >
                    <Icon icon="material-symbols:view-list-rounded" class="text-[1.25rem] shrink-0"></Icon>
                    <span class="text-xs font-medium">{i18n(I18nKey.listLayout)}</span>
                </button>
                <button
                    class="flex-1 btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
                    class:opacity-60={currentLayout !== "grid"}
                    class:bg-(--btn-regular-bg-hover)={currentLayout === "grid"}
                    onclick={switchLayout}
                    disabled={currentLayout === "grid" || isSwitching}
                >
                    <Icon icon="material-symbols:grid-view-rounded" class="text-[1.25rem] shrink-0"></Icon>
                    <span class="text-xs font-medium">{i18n(I18nKey.gridLayout)}</span>
                </button>
            </div>
        </div>
    {/if}

</div>
{/if}

<style>
	#display-setting input[type="range"] {
		appearance: none;
		-webkit-appearance: none;
		height: 1.5rem;
		background: var(--color-selection-bar);
		transition: background-image 0.15s ease-in-out;
	}

	#display-setting input[type="range"]::-webkit-slider-thumb {
		appearance: none;
		-webkit-appearance: none;
		height: 1rem;
		width: 0.5rem;
		border-radius: 0.125rem;
		background: rgb(255 255 255 / 70%);
	}

	#display-setting input[type="range"]::-moz-range-thumb {
		height: 1rem;
		width: 0.5rem;
		border: 0;
		border-radius: 0.125rem;
		background: rgb(255 255 255 / 70%);
	}
</style>
