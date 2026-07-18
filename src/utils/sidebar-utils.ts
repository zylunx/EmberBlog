import { sidebarLayoutConfig } from "@/config/sidebarConfig";
import type {
	SidebarAreaLayout,
	SidebarPageConfig,
} from "@/types/sidebarConfig";

export type ConfiguredSidebarComponentId =
	keyof typeof sidebarLayoutConfig.components & string;

export type ResolvedSidebarConfig = {
	enabled: boolean;
	layout: SidebarAreaLayout<ConfiguredSidebarComponentId>;
};

const normalizePath = (pathname: string): string => {
	const baseUrl = import.meta.env.BASE_URL || "/";
	const normalizedBase = baseUrl === "/" ? "" : baseUrl.replace(/\/$/, "");
	let path = pathname.split(/[?#]/, 1)[0] || "/";

	if (
		normalizedBase &&
		(path === normalizedBase || path.startsWith(`${normalizedBase}/`))
	) {
		path = path.slice(normalizedBase.length) || "/";
	}

	if (!path.startsWith("/")) path = `/${path}`;
	return path.length > 1 ? path.replace(/\/$/, "") : path;
};

/** 精确路径优先，其次匹配最长的末尾 * 前缀规则。 */
export const getSidebarPageConfig = (
	pathname: string,
): SidebarPageConfig<ConfiguredSidebarComponentId> | undefined => {
	const pages = sidebarLayoutConfig.pages;
	if (!pages) return undefined;

	const normalizedPath = normalizePath(pathname);
	const exactMatch = Object.entries(pages).find(
		([pattern]) =>
			!pattern.endsWith("*") && normalizePath(pattern) === normalizedPath,
	);
	if (exactMatch) return exactMatch[1];

	return Object.entries(pages)
		.filter(([pattern]) => pattern.endsWith("*"))
		.map(([pattern, config]) => ({
			config,
			prefix: normalizePath(pattern.slice(0, -1)),
		}))
		.filter(
			({ prefix }) =>
				prefix === "/" ||
				normalizedPath === prefix ||
				normalizedPath.startsWith(`${prefix}/`),
		)
		.sort((a, b) => b.prefix.length - a.prefix.length)[0]?.config;
};

/** 合并默认布局和页面部分覆盖；frontmatter 的 sidebar 只能关闭当前文章侧栏。 */
export const resolveSidebarConfig = (
	pathname: string,
	pageSidebar?: boolean,
): ResolvedSidebarConfig => {
	const pageConfig = getSidebarPageConfig(pathname);
	const enabled =
		sidebarLayoutConfig.enable && pageConfig !== false && pageSidebar !== false;

	if (!enabled) {
		return {
			enabled: false,
			layout: { left: [], right: [], mobileBottom: [] },
		};
	}

	const pageLayout = pageConfig || {};
	return {
		enabled: true,
		layout: {
			left: [...(pageLayout.left ?? sidebarLayoutConfig.default.left)],
			right: [...(pageLayout.right ?? sidebarLayoutConfig.default.right)],
			mobileBottom: [
				...(pageLayout.mobileBottom ??
					sidebarLayoutConfig.default.mobileBottom),
			],
		},
	};
};
