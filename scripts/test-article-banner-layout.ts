import assert from "node:assert/strict";
import {
	getBannerLayoutState,
	getEffectiveWallpaperMode,
} from "../src/utils/banner-layout-utils";

assert.equal(getEffectiveWallpaperMode("none", true), "banner");
assert.equal(getEffectiveWallpaperMode("overlay", true), "banner");
assert.equal(getEffectiveWallpaperMode("none", false), "none");

assert.deepEqual(
	getBannerLayoutState({
		wallpaperMode: "none",
		bannerEnabled: false,
		isPostPage: true,
	}),
	{
		isBannerMode: true,
		isFullscreenMode: false,
		isOverlayMode: false,
		isBackgroundEnabled: true,
	},
);

assert.deepEqual(
	getBannerLayoutState({
		wallpaperMode: "banner",
		bannerEnabled: false,
		isPostPage: true,
	}),
	{
		isBannerMode: true,
		isFullscreenMode: false,
		isOverlayMode: false,
		isBackgroundEnabled: true,
	},
);

assert.deepEqual(
	getBannerLayoutState({
		wallpaperMode: "none",
		bannerEnabled: false,
		isPostPage: false,
	}),
	{
		isBannerMode: false,
		isFullscreenMode: false,
		isOverlayMode: false,
		isBackgroundEnabled: false,
	},
);
