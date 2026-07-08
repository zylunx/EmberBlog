import type { BannerConfig } from "../types/bannerConfig";

interface PageBannerConfigEntry {
	// 页面路径。可以写单个路径，也可以写多个路径数组。
	path: string | string[];
	// 匹配方式：exact 为精确匹配，prefix 为前缀匹配。不写时默认 exact。
	match?: "exact" | "prefix";
	// 当前页面的 banner 配置。具体字段说明见 src/types/bannerConfig.ts。
	config: BannerConfig;
}

export const pageBannerConfig: PageBannerConfigEntry[] = [
	{
		path: "/about",
		config: {
			// 是否启用当前页面的 banner。
			enabled: false,
		},
	},
	// 示例：
	// {
	// 	path: "/about",
	// 	config: {
	// 		// 是否启用当前页面的 banner。
	// 		enabled: true,
	// 		// 是否显示普通页面的 banner 标题。
	// 		showTitle: true,
	// 		// 是否显示首页 banner 文案。
	// 		showHomeText: false,
	// 		// 是否显示文章页 banner 上的文章元信息。
	// 		showPostMeta: false,
	// 		// 当前页面自定义 banner 图片。
	// 		image: "/assets/images/about-banner.avif",
	// 		// 自定义 banner 图片的基础路径，用于解析相对路径图片。
	// 		imageBasePath: "/",
	// 		// 覆盖当前页面显示在 banner 上的标题文本。
	// 		title: "关于",
	// 	},
	// },
	// {
	// 	path: "/posts/",
	// 	match: "prefix",
	// 	config: {
	// 		showPostMeta: true,
	// 	},
	// },
];

export function getPageBannerConfig(pathname: string): BannerConfig {
	const normalizedPath = normalizePath(pathname);
	const entry = pageBannerConfig.find((item) => {
		const paths = Array.isArray(item.path) ? item.path : [item.path];
		return paths.some((path) => {
			const normalizedConfigPath = normalizePath(path);
			if (item.match === "prefix") {
				return (
					normalizedPath === normalizedConfigPath ||
					normalizedPath.startsWith(`${normalizedConfigPath}/`)
				);
			}
			return normalizedPath === normalizedConfigPath;
		});
	});

	return entry?.config ?? {};
}

function normalizePath(path: string): string {
	if (!path.startsWith("/")) return `/${path}`;
	if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
	return path;
}
