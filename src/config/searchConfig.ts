import type { SearchConfig } from "@/types/searchConfig";

/**
 * 搜索引擎配置。
 *
 * 相关环境变量（详见项目根目录 `.env.example`）：
 * - `PUBLIC_ALGOLIA_APP_ID`：可选，覆盖下方 `algolia.appId`
 * - `PUBLIC_ALGOLIA_SEARCH_KEY`：Search-Only Key，前端搜索必填
 * - `PUBLIC_ALGOLIA_INDEX`：可选，强制指定完整索引名
 * - `ALGOLIA_ADMIN_API_KEY`：Admin Key，仅构建/脚本用，切勿暴露给前端
 * - `ALGOLIA_INDEX_ENV`：`dev` | `prod`，脚本推送到哪个索引
 * - `ALGOLIA_INDEX_FORCE`：设为 `1` 才允许写入生产索引
 */
export const searchConfig: SearchConfig = {
	// 首选搜索引擎。Algolia 公开配置不全时自动回退 Pagefind
	// "algolia" | "pagefind"
	provider: "algolia",

	algolia: {
		// Algolia Application ID；也可只设环境变量 PUBLIC_ALGOLIA_APP_ID
		appId: "",

		// 开发 / 生产索引名（可用 PUBLIC_ALGOLIA_INDEX 整体覆盖）
		indexName: {
			dev: "emberblog_posts_dev",
			prod: "emberblog_posts_prod",
		},

		// 为 true 时：推送索引失败会让整次 pnpm build 失败
		failBuildOnIndexError: true,

		// 是否开启点击追踪（匿名 localStorage userToken）
		insights: true,

		// /search 页每页条数
		hitsPerPage: 10,
	},
};
