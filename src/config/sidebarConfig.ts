import type {
	SidebarLayoutConfig,
	WidgetComponentConfig,
} from "../types/sidebarConfig";

/**
 * 侧边栏组件实例库
 *
 * 每个键（如 profile、tags）都是一个可在布局中引用的组件 ID。
 * 同一个 ID 可以同时用于左栏、右栏和移动端底部。
 * 如果同类型组件需要不同配置，请定义多个 ID，例如 statsTop 和 statsSticky。
 * 组件只有被 default 或 pages 中的布局数组引用时才会显示，无需 enable 开关。
 */
const sidebarComponents = {
	// 个人资料卡片
	profile: {
		// 要渲染的组件类型
		type: "profile",
		// top 固定在侧栏上方；sticky 会随页面滚动吸附
		position: "top",
	},

	// 站点公告
	announcement: {
		type: "announcement",
		position: "top",
	},

	// 文章分类；分类数超过 5 个时折叠
	categories: {
		type: "categories",
		position: "sticky",
		// 当前组件独有的配置
		specificConfig: {
			collapseThreshold: 5,
		},
	},

	// 文章标签；标签数超过 10 个时折叠
	tags: {
		type: "tags",
		position: "sticky",
		specificConfig: {
			collapseThreshold: 10,
		},
	},

	// 粘性站点统计卡片
	statsSticky: {
		type: "stats",
		position: "sticky",
	},

	// 文章目录，通常在文章页面的右栏中使用
	sidebarToc: {
		type: "sidebarToc",
		position: "sticky",
	},

	// 顶部站点统计卡片；与 statsSticky 类型相同，但位置不同
	statsTop: {
		type: "stats",
		position: "top",
	},

	// 站点信息卡片
	siteInfo: {
		type: "siteInfo",
		position: "top",
		specificConfig: {
			siteInfo: {
				// 无法识别构建平台时显示的备用文字
				unknownBuildPlatform: "Unknown CI",
			},
		},
	},

	// 日历卡片
	calendar: {
		type: "calendar",
		// 不显示卡片标题
		showTitle: false,
		position: "sticky",
		specificConfig: {
			calendar: {
				// 显示年度文章热力图
				showHeatmap: true,
			},
		},
	},

	// 图片广告示例；当前未被布局引用，因此不会显示
	adBanner: {
		type: "advertisement",
		showTitle: false,
		position: "sticky",
		specificConfig: {
			ad: {
				// 广告图片及点击链接
				image: {
					src: "/assets/images/ad/ad1.webp",
					alt: "广告横幅",
					link: "https://haoka.lot-ml.com/plugreg.html?agentid=1423316",
					// true 表示在新标签页打开外部链接
					external: true,
				},
				// 是否允许访客关闭广告
				closable: false,
				// 显示次数；-1 表示不限制
				displayCount: -1,
				// 广告内容区内边距
				padding: {
					all: "1rem",
				},
			},
		},
	},

	// 文字广告示例；与 adBanner 类型相同，但内容配置不同
	adSupport: {
		type: "advertisement",
		position: "sticky",
		specificConfig: {
			ad: {
				// 广告标题和正文
				title: "支持博主",
				content:
					"如果您觉得本站内容对您有帮助，欢迎支持我们的创作！您的支持是我们持续更新的动力。",
				// 广告按钮
				link: {
					text: "支持一下",
					url: "about/",
					// false 表示站内链接
					external: false,
				},
				closable: false, // 不显示关闭按钮
				displayCount: -1, // 不限制显示次数
			},
		},
	},
} satisfies Record<string, WidgetComponentConfig>;

// 自动从组件实例库生成合法 ID 类型，布局中写错 ID 时 TypeScript 会报错。
type SidebarComponentId = keyof typeof sidebarComponents;

/**
 * 侧边栏配置
 *
 * 布局数组引用上方组件 ID，并决定同一 position 分组内的显示顺序。
 * 页面布局未配置的区域继承 default，空数组表示关闭该区域。
 * 未被 default 或 pages 引用的组件仅保留定义，不会渲染。
 */
export const sidebarLayoutConfig: SidebarLayoutConfig<SidebarComponentId> = {
	// 全局总开关。设为 false 后，任何页面配置都不能重新开启侧边栏。
	enable: true,

	// 页面同时有左右栏时，平板宽度只显示这一侧；桌面宽度仍显示两侧。
	tabletSidebar: "left",

	// 注册上方定义的全部组件实例，通常无需修改这一行。
	components: sidebarComponents,

	// 默认布局：未命中 pages，或页面未覆盖某个区域时使用这里的组件列表。
	// 数组中的 ID 决定显示内容和顺序；空数组表示关闭该区域。
	default: {
		// 非移动端布局的左侧栏
		left: [],
		// 非移动端布局的右侧栏
		right: ["profile", "tags", "calendar"],
		// 移动端页面底部区域（移动端不会显示左右侧栏）
		mobileBottom: ["announcement", "categories", "tags"],
	},

	// 页面级布局。精确路径优先，末尾 * 表示前缀匹配，最长的前缀优先。
	// 未填写的区域继承 default；写 [] 只关闭该区域；写 false 关闭整页侧栏。
	pages: {
		// 精确匹配 /about 和 /about/，关闭关于页的全部侧栏区域
		"/about": false,

		// 匹配所有 /posts/ 下的文章；只覆盖右栏，其余区域继承 default
		"/posts/*": {
			right: ["sidebarToc", "tags"],
		},
	},
};
