export interface BannerConfig {
	/** 是否启用当前页面的 banner。设为 false 时隐藏 banner，并让正文从导航栏下方开始。 */
	enabled?: boolean;
	/** 是否显示普通页面的 banner 标题。通常用于 about、archive、tags 等非文章页。 */
	showTitle?: boolean;
	/** 是否显示首页 banner 文案。通常只建议首页开启。 */
	showHomeText?: boolean;
	/** 是否显示文章页 banner 上的文章标题、日期、字数等元信息。 */
	showPostMeta?: boolean;
	/** 当前页面自定义 banner 图片。支持 public 目录路径，例如 "/assets/images/about-banner.avif"。 */
	image?: string;
	/** 自定义 banner 图片的基础路径，用于解析相对路径图片。默认是 "/"。 */
	imageBasePath?: string;
	/** 覆盖当前页面显示在 banner 上的标题文本。 */
	title?: string;
}
