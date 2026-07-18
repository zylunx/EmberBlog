// 组件配置类型定义
export type WidgetComponentType =
	| "profile"
	| "announcement"
	| "categories"
	| "tags"
	| "sidebarToc"
	| "advertisement"
	| "stats"
	| "calendar"
	| "siteInfo";

export type WidgetComponentConfig = {
	type: WidgetComponentType; // 组件类型
	showTitle?: boolean; // 是否显示该组件标题，默认 true
	position: "top" | "sticky"; // 左右侧栏中的位置；移动端底部会忽略该配置
	specificConfig?: WidgetSpecificConfig;
	customProps?: Record<string, unknown>; // 自定义属性，用于扩展组件功能
};

export type SidebarAreaLayout<TComponentId extends string = string> = {
	left: TComponentId[];
	right: TComponentId[];
	mobileBottom: TComponentId[];
};

export type SidebarPageLayout<TComponentId extends string = string> = Partial<
	SidebarAreaLayout<TComponentId>
>;

export type SidebarPageConfig<TComponentId extends string = string> =
	| false
	| SidebarPageLayout<TComponentId>;

// 组件通用专属配置
export type WidgetSpecificConfig = {
	hidden?: ("mobile" | "tablet" | "desktop")[]; // 在指定设备上隐藏
	collapseThreshold?: number; // 折叠阈值
	calendar?: CalendarConfig; // 日历组件专用配置
	ad?: AdConfig; // 广告栏配置
	siteInfo?: SiteInfoConfig; // 站点信息配置
};

// 站点信息组件专用配置
export type SiteInfoConfig = {
	unknownBuildPlatform?: string; // 未识别的构建平台显示文本，默认 "Unknown CI"
};

// 日历组件专用配置
export type CalendarConfig = {
	showHeatmap: boolean;
};

// 广告栏配置
export type AdConfig = {
	title?: string;
	content?: string;
	image?: { src: string; alt?: string; link?: string; external?: boolean };
	link?: { text: string; url: string; external?: boolean };
	padding?: {
		top?: string;
		right?: string;
		bottom?: string;
		left?: string;
		all?: string;
	};
	closable?: boolean;
	displayCount?: number; // 显示次数限制，-1 为无限制
	expireDate?: string; // 过期时间（ISO 8601）
};

export type SidebarLayoutConfig<TComponentId extends string = string> = {
	enable: boolean; // 所有侧边栏的总开关
	tabletSidebar?: "left" | "right"; // 双侧栏时，平板端显示哪一侧，默认 left
	components: Record<TComponentId, WidgetComponentConfig>; // 可复用的组件实例定义
	default: SidebarAreaLayout<TComponentId>; // 默认页面布局
	pages?: Record<string, SidebarPageConfig<TComponentId>>; // 页面覆盖；精确路径或末尾 * 前缀匹配
};
