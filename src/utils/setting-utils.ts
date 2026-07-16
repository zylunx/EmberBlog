import {
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
	SYSTEM_MODE,
} from "@constants/constants";
import type { LIGHT_DARK_MODE } from "@/types/config";
import {
	backgroundWallpaper,
	expressiveCodeConfig,
	siteConfig,
} from "../config";

// Declare global functions
declare global {
	interface Window {
		initSemifullScrollDetection?: () => void;
		semifullScrollHandler?: () => void;
	}
}

export function getDefaultTheme(): LIGHT_DARK_MODE {
	return siteConfig.theme.defaultMode ?? DEFAULT_THEME;
}

// 获取系统主题
export function getSystemTheme(): LIGHT_DARK_MODE {
	if (typeof window === "undefined") {
		return LIGHT_MODE;
	}
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? DARK_MODE
		: LIGHT_MODE;
}

// 解析主题（如果是system模式，则获取系统主题）
export function resolveTheme(theme: LIGHT_DARK_MODE): LIGHT_DARK_MODE {
	if (theme === SYSTEM_MODE) {
		return getSystemTheme();
	}
	return theme;
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE) {
	// 检查是否在浏览器环境中
	if (typeof document === "undefined") {
		return;
	}

	// 解析主题
	const resolvedTheme = resolveTheme(theme);

	// 获取当前主题状态的完整信息
	const currentIsDark = document.documentElement.classList.contains("dark");
	const currentTheme = document.documentElement.getAttribute("data-theme");

	// 计算目标主题状态
	let targetIsDark = false; // 初始化默认值
	switch (resolvedTheme) {
		case LIGHT_MODE:
			targetIsDark = false;
			break;
		case DARK_MODE:
			targetIsDark = true;
			break;
		default:
			// 处理默认情况，使用当前主题状态
			targetIsDark = currentIsDark;
			break;
	}

	// 检测是否真的需要主题切换：
	// 1. dark类状态是否改变
	// 2. expressiveCode主题是否需要更新
	const needsThemeChange = currentIsDark !== targetIsDark;
	const expectedTheme = targetIsDark
		? expressiveCodeConfig.darkTheme
		: expressiveCodeConfig.lightTheme;
	const needsCodeThemeUpdate = currentTheme !== expectedTheme;

	// 如果既不需要主题切换也不需要代码主题更新，直接返回
	if (!needsThemeChange && !needsCodeThemeUpdate) {
		return;
	}

	// 批量 DOM 操作，减少重绘
	if (needsThemeChange) {
		// 添加过渡保护类（但会导致大量重绘，所以使用更轻量的方式）
		// document.documentElement.classList.add("is-theme-transitioning");

		// 直接切换主题，利用 CSS 变量的特性让浏览器优化过渡
		if (targetIsDark) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}

	// Set the theme for Expressive Code based on current mode
	if (needsCodeThemeUpdate) {
		document.documentElement.setAttribute("data-theme", expectedTheme);
	}
}

// 系统主题监听器引用
let systemThemeListener:
	| ((e: MediaQueryListEvent | MediaQueryList) => void)
	| null = null;

export function setTheme(theme: LIGHT_DARK_MODE): void {
	// 检查是否在浏览器环境中
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.setItem !== "function"
	) {
		return;
	}

	// 先应用主题
	applyThemeToDocument(theme);

	// 保存到localStorage
	localStorage.setItem("theme", theme);

	// 如果切换到 system 模式，需要监听系统主题变化
	if (theme === SYSTEM_MODE) {
		setupSystemThemeListener();
	} else {
		// 如果切换其他模式，移除系统主题监听
		cleanupSystemThemeListener();
	}
}

// 设置系统主题监听器
export function setupSystemThemeListener() {
	// 先清理之前的监听器
	cleanupSystemThemeListener();

	if (typeof window === "undefined") {
		return;
	}

	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

	// 处理系统主题变化的回调
	const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
		const isDark = e.matches;
		const currentIsDark = document.documentElement.classList.contains("dark");

		// 如果主题状态没有变化，直接返回
		if (currentIsDark === isDark) {
			return;
		}

		// 直接应用系统主题，不使用过渡保护类以避免大量重绘
		if (isDark) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}

		// Set the theme for Expressive Code
		const expressiveTheme = isDark
			? expressiveCodeConfig.darkTheme
			: expressiveCodeConfig.lightTheme;
		document.documentElement.setAttribute("data-theme", expressiveTheme);

		// 触发自定义事件通知其他组件（仅在真正切换时触发）
		window.dispatchEvent(new CustomEvent("theme-change"));
	};

	// 立即调用一次以设置初始状态
	handleSystemThemeChange(mediaQuery);

	// 监听系统主题变化（现代浏览器）
	if (mediaQuery.addEventListener) {
		mediaQuery.addEventListener("change", handleSystemThemeChange);
	} else {
		// 兼容旧浏览器
		mediaQuery.addListener(handleSystemThemeChange);
	}

	systemThemeListener = handleSystemThemeChange;
}

// 清理系统主题监听器
function cleanupSystemThemeListener() {
	if (typeof window === "undefined" || !systemThemeListener) {
		return;
	}

	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

	if (mediaQuery.removeEventListener) {
		mediaQuery.removeEventListener("change", systemThemeListener);
	} else {
		// 兼容旧浏览器
		mediaQuery.removeListener(systemThemeListener);
	}

	systemThemeListener = null;
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	// 检查是否在浏览器环境中
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return getDefaultTheme();
	}
	return (
		(localStorage.getItem("theme") as LIGHT_DARK_MODE) || getDefaultTheme()
	);
}

// 初始化主题监听器（用于页面加载后）
export function initThemeListener() {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return;
	}

	const theme = getStoredTheme();

	// 如果主题是 system 模式，需要监听系统主题变化
	if (theme === SYSTEM_MODE) {
		setupSystemThemeListener();
	}
}

function isCurrentPostPage(): boolean {
	if (typeof document === "undefined") return false;
	return (
		document.getElementById("swup-container")?.dataset.isPostPage === "true"
	);
}

// Wallpaper mode functions
export function applyWallpaperModeToDocument(): void {
	if (typeof document === "undefined") return;
	document.body.classList.remove("enable-banner", "wallpaper-transparent");

	const isPost = isCurrentPostPage();
	const mainContent = document.querySelector(
		".w-full.z-30.pointer-events-none",
	) as HTMLElement | null;
	const wrapper = document.getElementById(
		"wallpaper-wrapper",
	) as HTMLElement | null;

	if (isPost) {
		// 文章详情页保持 banner 布局，切勿被「无壁纸模式」覆盖成列表布局
		document.body.classList.add("post-page-banner", "wallpaper-initialized");
		document.body.classList.remove("no-banner-layout");
		if (wrapper) {
			wrapper.style.display = "block";
			wrapper.classList.remove(
				"page-banner-disabled",
				"mobile-hide-banner",
				"hidden",
				"opacity-0",
			);
		}
		if (mainContent) {
			mainContent.classList.remove("no-banner-layout", "mobile-main-no-banner");
			mainContent.style.setProperty(
				"top",
				"calc(var(--banner-height) - 3.5rem)",
				"important",
			);
			mainContent.style.setProperty("margin-top", "0", "important");
			mainContent.style.position = "";
			mainContent.style.minHeight = "";
			mainContent.style.visibility = "visible";
		}
	} else {
		document.body.classList.add("no-banner-layout", "wallpaper-initialized");
		document.body.classList.remove("post-page-banner");
		if (wrapper) {
			wrapper.style.display = "none";
			wrapper.classList.add("page-banner-disabled", "mobile-hide-banner");
		}
		if (mainContent) {
			mainContent.classList.add("no-banner-layout");
			mainContent.style.setProperty(
				"top",
				"var(--navbar-content-offset, 4.5rem)",
				"important",
			);
			mainContent.style.setProperty("margin-top", "0", "important");
			mainContent.style.position = "";
			mainContent.style.minHeight = "";
			mainContent.style.visibility = "visible";
		}
	}

	const navbar = document.getElementById("navbar");
	if (navbar) {
		navbar.setAttribute("data-transparent-mode", "semi");
		navbar.setAttribute("data-enable-blur", "false");
		navbar.style.setProperty("--navbar-glass-blur", "0px");
		navbar.classList.remove(
			"navbar-transparent-semi",
			"navbar-transparent-full",
			"navbar-transparent-semifull",
			"scrolled",
		);
	}
}

export function initWallpaperMode(): void {
	if (typeof localStorage !== "undefined") {
		localStorage.removeItem("wallpaperMode");
	}
	applyWallpaperModeToDocument();
}

// Article waves functions
export function getDefaultWavesEnabled(): boolean {
	const wavesConfig = backgroundWallpaper.articleWaves?.enable;
	if (typeof wavesConfig === "object") {
		const isMobile =
			typeof window !== "undefined" ? window.innerWidth < 768 : false;
		return isMobile
			? (wavesConfig.mobile ?? false)
			: (wavesConfig.desktop ?? false);
	}
	return wavesConfig ?? false;
}

export function getStoredWavesEnabled(): boolean {
	return getDefaultWavesEnabled();
}

export function setWavesEnabled(enabled: boolean): void {
	applyWavesEnabledToDocument(enabled);
}

export function applyWavesEnabledToDocument(enabled: boolean): void {
	if (typeof document === "undefined") return;
	document.documentElement.setAttribute("data-waves-enabled", String(enabled));
	const wavesElement = document.getElementById("header-waves");
	if (!wavesElement) return;
	if (enabled) {
		wavesElement.style.display = "";
		wavesElement.classList.remove("waves-disabled");
	} else {
		wavesElement.style.display = "none";
		wavesElement.classList.add("waves-disabled");
	}
}
