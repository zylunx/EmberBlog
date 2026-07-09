# 设计文档：修复 `mode: "none"` 下各页面排版问题

**日期**: 2026-07-08
**状态**: 设计已确认，待实现
**方案**: 方案 A - 新增独立 CSS 类

---

## 一、问题描述

当 `src/config/backgroundWallpaper.ts` 中 `mode: "none"` 时：

1. **非文章页（首页、归档、分类、标签等）**：导航栏与下方内容之间出现大片空白
2. **文章详情页**：排版与 `mode: "banner"` 时不同，存在标题重叠等问题

## 二、用户需求

- 文章详情页：保持 `mode: "banner"` 时的完整 banner 视觉（顶部图片横幅 + 文章标题/日期/字数等元信息覆盖层），但**不直接应用 banner 的 CSS**，通过复制 CSS 实现独立解耦，便于以后修改 banner 模式时不影响文章页
- 其他页面：去掉空白，优化排版
- 不影响 `banner` / `fullscreen` / `overlay` 模式的现有行为

## 三、解决思路

### 3.1 文章详情页：独立 CSS 类 `.post-page-banner`

新增独立的 CSS 类 `.post-page-banner`，复制当前 `.enable-banner` 模式下的布局相关 CSS 规则，与 `.enable-banner` 完全解耦。

**复制范围**（来自 `src/layouts/Layout.astro` 的 `<style is:global>` 块）：

```css
@layer components {
  .post-page-banner #wallpaper-wrapper {
    height: var(--banner-height-home);
    transform: translateY(var(--banner-height-extend));
  }

  .post-page-banner #banner {
    height: var(--banner-height-home);
    transform: translateY(0);
  }

  .post-page-banner #main-grid {
    transform: translateY(var(--banner-height-extend));
  }

  .post-page-banner #top-row {
    height: calc(var(--banner-height-home) - 4.5rem);
    @apply transition-all duration-300;
  }
}

@layer utilities {
  .post-page-banner #sidebar-sticky,
  .post-page-banner #left-sidebar-sticky,
  .post-page-banner #right-sidebar-sticky {
    top: calc(1rem - var(--banner-height-extend)) !important;
  }

  body.post-page-banner.sticky-navbar #sidebar-sticky,
  body.post-page-banner.sticky-navbar #left-sidebar-sticky,
  body.post-page-banner.sticky-navbar #right-sidebar-sticky {
    top: calc(5.5rem - var(--banner-height-extend)) !important;
  }

  @media (max-width: 1023px) {
    .post-page-banner:not(.lg\:is-home) #main-grid {
      transform: none !important;
    }
    .post-page-banner:not(.lg\:is-home) #top-row {
      height: auto !important;
    }
    .post-page-banner:not(.lg\:is-home) #sidebar-sticky,
    .post-page-banner:not(.lg\:is-home) #left-sidebar-sticky,
    .post-page-banner:not(.lg\:is-home) #right-sidebar-sticky {
      top: 1rem !important;
    }
  }
}
```

### 3.2 非文章页：修复空白

新增针对 `mode: "none"` 的 CSS 规则：

```css
/* mode: none 时，非文章页主内容紧跟导航栏，无空白 */
html[data-wallpaper-mode="none"] body:not(.post-page-banner) .absolute.w-full.z-30.no-banner-layout {
  top: 5.5rem !important;
  min-height: calc(100vh - 5.5rem) !important;
}

/* mode: none 时隐藏 #top-row 的 banner 占位高度 */
html[data-wallpaper-mode="none"] body:not(.post-page-banner):not(.sticky-navbar) #top-row {
  height: 0 !important;
  overflow: visible !important;
  transition: none !important;
}
```

## 四、文件改动清单

### 4.1 `src/layouts/Layout.astro`

#### 4.1.1 `enableBanner` 和 `forceArticleBanner` 逻辑（第 64-67 行）

```js
// 修改前
const enableBanner =
	(backgroundWallpaper.mode === "banner" || !!postSlug) &&
	bannerEnabled !== false;
const forceArticleBanner = !!postSlug && bannerEnabled !== false;

// 修改后
// 文章页使用独立的 post-page-banner 类，不再依赖 enable-banner
const forceArticleBanner = !!postSlug && bannerEnabled !== false;
// enableBanner 仅用于 banner 模式（非文章页）
const enableBanner =
	backgroundWallpaper.mode === "banner" && bannerEnabled !== false;
```

#### 4.1.2 body `class:list`（第 561-573 行）

```astro
class:list={[
	{
		"is-home": isHomePageCheck,
		"lg:is-home": isHomePageCheck,
		"enable-banner": enableBanner,
		"post-page-banner": forceArticleBanner,  // 新增
		"sticky-navbar": siteConfig.navbar.stickyNavbar ?? false,
		"enable-card-border": siteConfig.card?.border,
		"card-follow-theme-hue": siteConfig.card?.followTheme,
	},
]}
```

#### 4.1.3 内联脚本 `applyWallpaperMode`（第 360-515 行）

修改 body 类名应用逻辑：

```js
// 文章页始终使用 post-page-banner 类，不受 wallpaper mode 影响
if (forceArticleBanner) {
  if (document.body) {
    document.body.classList.remove("enable-banner");
    document.body.classList.add("post-page-banner");
    document.body.classList.remove("no-banner-layout");
  }
} else if (
  wallpaperMode === WALLPAPER_NONE ||
  wallpaperMode === WALLPAPER_OVERLAY ||
  wallpaperMode === WALLPAPER_FULLSCREEN
) {
  if (document.body) {
    document.body.classList.remove("enable-banner", "post-page-banner");
    document.body.classList.add("no-banner-layout");
  }
} else {
  if (document.body) {
    document.body.classList.add("enable-banner");
    document.body.classList.remove("post-page-banner", "no-banner-layout");
  }
}
```

#### 4.1.4 Swup `visit:start` 钩子（第 1088-1100 行 & 桌面端分支 1182-1204）

```js
// visit:start 中同步 body 类
// 现有代码：const currentWallpaperMode = isPostPage ? "banner" : document.documentElement.getAttribute("data-wallpaper-mode");
// 保持 currentWallpaperMode = "banner" 用于文章页，确保后续判断不误处理
if (!isPostPage) {
  if (currentWallpaperMode !== "banner") {
    bodyElement!.classList.remove("enable-banner", "post-page-banner");
    bodyElement!.classList.add("no-banner-layout");
    if (currentWallpaperMode === "overlay") {
      bodyElement!.classList.add("wallpaper-transparent");
    } else {
      bodyElement!.classList.remove("wallpaper-transparent");
    }
  }
} else {
  // 文章页：确保 post-page-banner 类，移除 enable-banner 和 no-banner-layout
  bodyElement!.classList.remove("enable-banner", "no-banner-layout");
  bodyElement!.classList.add("post-page-banner");
}
```

桌面端 wallpaper-wrapper 处理新增 `none` 分支：

```js
if (visitDesktopMode === "none") {
  // none 模式：隐藏 wallpaper-wrapper，主内容紧跟导航栏
  wallpaperWrapper.style.display = "none";
  if (mainContentWrapper) {
    mainContentWrapper.style.setProperty("top", "5.5rem", "important");
    mainContentWrapper.style.position = "";
    mainContentWrapper.style.zIndex = "";
    mainContentWrapper.style.setProperty("margin-top", "0", "important");
  }
}
```

#### 4.1.5 Swup `content:replace` 钩子（第 965-1003 行）

新增 `none` 模式非文章页处理：

```js
// 桌面端 none 模式非文章页：主内容紧跟导航栏
if (!isMobileForBanner && currentMode === "none" && mainEl && !isPostPage) {
  mainEl.style.setProperty("top", "5.5rem", "important");
  mainEl.style.position = "";
  mainEl.style.zIndex = "";
  mainEl.style.setProperty("margin-top", "0", "important");
}
```

#### 4.1.6 Swup `page:view` 钩子（第 1256-1342 行）

修改 `currentMode === "banner"` 分支，区分文章页和非文章页：

```js
if (currentMode === "banner") {
  if (isPostPage) {
    document.body.classList.add("post-page-banner");
    document.body.classList.remove("enable-banner", "no-banner-layout");
  } else if (pageBannerEnabled) {
    document.body.classList.add("enable-banner");
    document.body.classList.remove("no-banner-layout", "post-page-banner");
  } else {
    document.body.classList.remove("enable-banner", "post-page-banner");
    document.body.classList.add("no-banner-layout");
  }
}
```

新增 `none` 模式非文章页处理：

```js
// 桌面端 none 模式非文章页：主内容紧跟导航栏
if (!isMobileForBanner && currentMode === "none" && mainEl && !isPostPage) {
  mainEl.style.setProperty("top", "5.5rem", "important");
  mainEl.style.position = "";
  mainEl.style.zIndex = "";
  mainEl.style.setProperty("margin-top", "0", "important");
}
```

### 4.2 `src/layouts/MainGridLayout.astro`

#### 4.2.1 主内容区 div 类名（第 364 行）

```astro
---
// 新增计算
const isPostPageBannerLayout = isPostPage && effectiveBackgroundEnabled;
const mainContentLayoutClass =
  isPostPageBannerLayout
    ? ""  // 文章页不加 no-banner-layout（由 Layout.astro 添加 post-page-banner）
    : (isBannerMode && effectiveBackgroundEnabled)
      ? ""
      : "no-banner-layout";
---

<div class={`absolute w-full z-30 pointer-events-none ${mobileNonHomeBannerClass ? 'mobile-main-no-banner' : ''} ${mainContentLayoutClass}`} style={isFullscreenMode && effectiveBackgroundEnabled ? 'top: 0;' : `top: ${finalMainPanelTop}`}>
```

### 4.3 `src/styles/layout-styles.css`

在文件末尾追加：

```css
/* ============================================
 * 文章详情页独立 banner 布局（与 .enable-banner 解耦）
 * 当 mode: "none" 时，文章页仍保持 banner 视觉布局
 * ============================================ */
@layer components {
  .post-page-banner #wallpaper-wrapper {
    height: var(--banner-height-home);
    transform: translateY(var(--banner-height-extend));
  }

  .post-page-banner #banner {
    height: var(--banner-height-home);
    transform: translateY(0);
  }

  .post-page-banner #main-grid {
    transform: translateY(var(--banner-height-extend));
  }

  .post-page-banner #top-row {
    height: calc(var(--banner-height-home) - 4.5rem);
    @apply transition-all duration-300;
  }
}

@layer utilities {
  .post-page-banner #sidebar-sticky,
  .post-page-banner #left-sidebar-sticky,
  .post-page-banner #right-sidebar-sticky {
    top: calc(1rem - var(--banner-height-extend)) !important;
  }

  body.post-page-banner.sticky-navbar #sidebar-sticky,
  body.post-page-banner.sticky-navbar #left-sidebar-sticky,
  body.post-page-banner.sticky-navbar #right-sidebar-sticky {
    top: calc(5.5rem - var(--banner-height-extend)) !important;
  }

  @media (max-width: 1023px) {
    .post-page-banner:not(.lg\:is-home) #main-grid {
      transform: none !important;
    }
    .post-page-banner:not(.lg\:is-home) #top-row {
      height: auto !important;
    }
    .post-page-banner:not(.lg\:is-home) #sidebar-sticky,
    .post-page-banner:not(.lg\:is-home) #left-sidebar-sticky,
    .post-page-banner:not(.lg\:is-home) #right-sidebar-sticky {
      top: 1rem !important;
    }
  }
}

/* ============================================
 * mode: none 非文章页布局修复
 * 主内容紧跟导航栏，消除空白
 * ============================================ */
html[data-wallpaper-mode="none"] body:not(.post-page-banner) .absolute.w-full.z-30.no-banner-layout {
  top: 5.5rem !important;
  min-height: calc(100vh - 5.5rem) !important;
}

html[data-wallpaper-mode="none"] body:not(.post-page-banner):not(.sticky-navbar) #top-row {
  height: 0 !important;
  overflow: visible !important;
  transition: none !important;
}
```

## 五、不修改的部分

| 文件 | 原因 |
|------|------|
| `src/components/layout/Banner.astro` | 文章页 `isBannerMode` 已为 true（来自 `banner-layout-utils.ts`），组件逻辑正确 |
| `src/utils/banner-layout-utils.ts` | 文章页返回 `isBannerMode: true`，逻辑正确 |
| `src/styles/navbar.css` | 文章页 `data-wallpaper-mode="banner"`，导航栏样式正确应用 |
| `src/styles/waves.css` | 水波纹样式不变 |
| `src/config/backgroundWallpaper.ts` | 配置不变 |
| `src/types/backgroundWallpaper.ts` | 类型不变 |

## 六、关键设计原则

1. **解耦**：`.post-page-banner` 与 `.enable-banner` 互斥，不共存
2. **复用组件**：`Banner.astro` 继续渲染 banner 内容，仅 CSS 类名不同
3. **最小改动**：不新增 wallpaper mode，不修改类型定义
4. **不影响其他模式**：`banner` / `fullscreen` / `overlay` 模式行为完全不变
5. **data-wallpaper-mode 一致性**：文章页始终为 `"banner"`，确保导航栏、水波纹等依赖该属性的样式正确

## 七、验证要点

1. **文章详情页**（`mode: "none"`）：
   - banner 图片正常显示
   - 文章标题、日期、字数等元信息覆盖在 banner 上，无重叠
   - 导航栏透明效果正常
   - 主内容区位于 banner 下方，无空白

2. **非文章页**（`mode: "none"`）：
   - 首页、归档、分类、标签等页面无大片空白
   - 主内容紧跟导航栏下方
   - 无 wallpaper-wrapper 残留空间

3. **其他模式不受影响**：
   - `mode: "banner"`：所有页面行为不变
   - `mode: "fullscreen"`：所有页面行为不变
   - `mode: "overlay"`：所有页面行为不变

4. **页面切换（Swup）**：
   - 文章页 ↔ 非文章页切换时，类名正确应用/移除
   - 无闪烁、无残留类名

## 八、风险与注意事项

1. **CSS 重复**：`.post-page-banner` 复制了 `.enable-banner` 的部分规则，后续如果 banner 模式的布局 CSS 变化，文章页保持不变（这正是用户期望的解耦）
2. **Swup 钩子复杂度**：现有 Swup 钩子已较复杂，新增逻辑需谨慎测试，确保不破坏现有模式切换
3. **移动端**：现有移动端逻辑已处理 `forceArticleBanner`，新增改动主要影响桌面端 `none` 模式分支
