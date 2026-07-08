import type { BackgroundWallpaperConfig } from "@/types/backgroundWallpaper";

type WallpaperMode = BackgroundWallpaperConfig["mode"];

interface BannerLayoutStateInput {
	wallpaperMode: WallpaperMode;
	bannerEnabled?: boolean;
	isPostPage: boolean;
}

interface BannerLayoutState {
	isBannerMode: boolean;
	isFullscreenMode: boolean;
	isOverlayMode: boolean;
	isBackgroundEnabled: boolean;
}

export function getBannerLayoutState({
	wallpaperMode,
	bannerEnabled,
	isPostPage,
}: BannerLayoutStateInput): BannerLayoutState {
	const effectiveWallpaperMode = getEffectiveWallpaperMode(
		wallpaperMode,
		isPostPage,
	);

	if (isPostPage) {
		return {
			isBannerMode: true,
			isFullscreenMode: false,
			isOverlayMode: false,
			isBackgroundEnabled: true,
		};
	}

	const isBackgroundEnabled =
		effectiveWallpaperMode !== "none" && bannerEnabled !== false;

	return {
		isBannerMode: effectiveWallpaperMode === "banner",
		isFullscreenMode: effectiveWallpaperMode === "fullscreen",
		isOverlayMode: effectiveWallpaperMode === "overlay",
		isBackgroundEnabled,
	};
}

export function getEffectiveWallpaperMode(
	wallpaperMode: WallpaperMode,
	isPostPage: boolean,
): WallpaperMode {
	return isPostPage ? "banner" : wallpaperMode;
}
