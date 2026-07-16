export type { AnalyticsConfig } from "./analyticsConfig";
export type { AnnouncementConfig } from "./announcementConfig";
export type { BackgroundWallpaperConfig } from "./backgroundWallpaper";
export type { CommentConfig } from "./commentConfig";
export type {
	ExpressiveCodeConfig,
	PluginCollapsibleConfig,
	PluginLanguageBadgeConfig,
} from "./expressiveCodeConfig";
export type { FontSelectionConfig } from "./fontConfig";
export type { FooterConfig } from "./footerConfig";
export type { FriendLink, FriendsPageConfig } from "./friendsConfig";
export type { GalleryAlbum, GalleryConfig } from "./galleryConfig";
export type { Img2ColorConfig } from "./img2color";
export type { LicenseConfig } from "./licenseConfig";
export type {
	NavBarConfig,
	NavBarLink,
	NavBarSearchConfig,
	NavBarSearchMethod,
} from "./navBarConfig";
export type { PlantUMLConfig } from "./plantumlConfig";
export type { ProfileConfig } from "./profileConfig";
export type {
	AdConfig,
	CalendarConfig,
	MobileBottomComponentConfig,
	SidebarLayoutConfig,
	SiteInfoConfig,
	WidgetComponentConfig,
	WidgetComponentType,
	WidgetSpecificConfig,
} from "./sidebarConfig";
export type {
	Favicon,
	LIGHT_DARK_MODE,
	SiteConfig,
} from "./siteConfig";
export type {
	SponsorConfig,
	SponsorItem,
	SponsorMethod,
} from "./sponsorConfig";
export type {
	AlgoliaIndexNames,
	AlgoliaSearchConfig,
	SearchConfig,
	SearchProvider,
} from "./searchConfig";

// 响应式图像布局类型
export type ResponsiveImageLayout = "constrained" | "full-width" | "none";

// 图像格式类型
export type ImageFormat = "avif" | "webp" | "png" | "jpg" | "jpeg" | "gif";
