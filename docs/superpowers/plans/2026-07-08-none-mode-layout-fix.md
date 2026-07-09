# 修复 `mode: "none"` 下各页面排版问题 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `backgroundWallpaper.ts` 中 `mode: "none"` 时非文章页的导航栏下方空白问题，同时让文章详情页保持 `banner` 模式的完整视觉布局（使用独立 CSS 类，与 `.enable-banner` 解耦）。

**Architecture:** 新增 `.post-page-banner` CSS 类（复制 `.enable-banner` 的布局规则），文章页通过该类应用 banner 布局，不再依赖 `.enable-banner`。非文章页通过 `no-banner-layout` + `top: 5.5rem` 消除空白。Swup 钩子同步处理类名切换。

**Tech Stack:** Astro, TypeScript, Tailwind CSS 4, Swup

**Spec:** `docs/superpowers/specs/2026-07-08-none-mode-layout-fix-design.md`

---

## 文件结构

| 文件 | 责任 | 改动类型 |
|------|------|----------|
| `src/styles/layout-styles.css` | 新增 `.post-page-banner` CSS 规则 + `mode: none` 非文章页修复 | 追加 |
| `src/layouts/Layout.astro` | `enableBanner` 逻辑、body 类名、内联脚本、Swup 钩子 | 修改 |
| `src/layouts/MainGridLayout.astro` | 主内容区 div 的 `no-banner-layout` 类应用条件 | 修改 |

---

## Task 1: 新增 `.post-page-banner` CSS 规则到 `layout-styles.css`

**Files:**
- Modify: `src/styles/layout-styles.css`（文件末尾追加，第 468 行之后）

- [ ] **Step 1: 在 `layout-styles.css` 末尾追加文章页独立 banner 布局 CSS**

打开 `src/styles/layout-styles.css`，在文件末尾（第 468 行 `}` 之后）追加以下内容：

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

- [ ] **Step 2: 验证 CSS 语法**

运行：`pnpm check`
预期：无 CSS 语法错误（Astro 检查会包含样式文件）

- [ ] **Step 3: Commit**

```bash
git add src/styles/layout-styles.css
git commit -m "style: 新增文章页独立 banner 布局 CSS

- style: 新增 .post-page-banner 类复制 banner 布局规则
- fix: 修复 mode: none 非文章页主内容空白问题"
```

---

## Task 2: 修改 `Layout.astro` 的 `enableBanner` 逻辑和 body 类名

**Files:**
- Modify: `src/layouts/Layout.astro:64-67`（`enableBanner` 逻辑）
- Modify: `src/layouts/Layout.astro:561-573`（body `class:list`）

- [ ] **Step 1: 修改 `enableBanner` 逻辑（第 64-67 行）**

将 `src/layouts/Layout.astro` 第 64-67 行：

```js
const enableBanner =
	(backgroundWallpaper.mode === "banner" || !!postSlug) &&
	bannerEnabled !== false;
const forceArticleBanner = !!postSlug && bannerEnabled !== false;
```

替换为：

```js
// 文章页使用独立的 post-page-banner 类，不再依赖 enable-banner
const forceArticleBanner = !!postSlug && bannerEnabled !== false;
// enableBanner 仅用于 banner 模式（非文章页）
const enableBanner =
	backgroundWallpaper.mode === "banner" && bannerEnabled !== false;
```

- [ ] **Step 2: 在 body `class:list` 中新增 `post-page-banner` 类（第 563-572 行）**

将第 563-572 行：

```astro
    class:list={[
      {
        "is-home": isHomePageCheck,
        "lg:is-home": isHomePageCheck,
        "enable-banner": enableBanner,
        "sticky-navbar": siteConfig.navbar.stickyNavbar ?? false,
        "enable-card-border": siteConfig.card?.border,
        "card-follow-theme-hue": siteConfig.card?.followTheme,
      },
    ]}
```

替换为：

```astro
    class:list={[
      {
        "is-home": isHomePageCheck,
        "lg:is-home": isHomePageCheck,
        "enable-banner": enableBanner,
        "post-page-banner": forceArticleBanner,
        "sticky-navbar": siteConfig.navbar.stickyNavbar ?? false,
        "enable-card-border": siteConfig.card?.border,
        "card-follow-theme-hue": siteConfig.card?.followTheme,
      },
    ]}
```

- [ ] **Step 3: 验证类型检查**

运行：`pnpm check`
预期：PASS

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: 文章页使用独立 post-page-banner 类

- refactor: enableBanner 仅用于非文章页 banner 模式
- feat: body class:list 新增 post-page-banner 类"
```

---

## Task 3: 修改 `Layout.astro` 内联脚本 `applyWallpaperMode` 的 body 类名逻辑

**Files:**
- Modify: `src/layouts/Layout.astro:360-379`（`applyWallpaperMode` 函数中的 body 类名处理）

- [ ] **Step 1: 修改 body 类名应用逻辑（第 364-379 行）**

将第 364-379 行：

```js
          if (
            wallpaperMode === WALLPAPER_NONE ||
            wallpaperMode === WALLPAPER_OVERLAY ||
            wallpaperMode === WALLPAPER_FULLSCREEN
          ) {
            // 隐藏横幅
            if (document.body) {
              document.body.classList.remove("enable-banner");
              document.body.classList.add("no-banner-layout");
            }
          } else {
            if (document.body) {
              document.body.classList.add("enable-banner");
              document.body.classList.remove("no-banner-layout");
            }
          }
```

替换为：

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
            // 隐藏横幅
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

- [ ] **Step 2: 验证类型检查**

运行：`pnpm check`
预期：PASS

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: applyWallpaperMode 区分文章页 body 类名

- feat: 文章页应用 post-page-banner 类
- refactor: 非文章页清理 post-page-banner 残留"
```

---

## Task 4: 修改 Swup `visit:start` 钩子同步 body 类名

**Files:**
- Modify: `src/layouts/Layout.astro:1088-1100`（`visit:start` 钩子中的 body 类同步逻辑）

- [ ] **Step 1: 修改 `visit:start` 钩子的 body 类同步逻辑（第 1088-1100 行）**

将第 1088-1100 行：

```js
      // 同步壁纸模式的 body 类（防止 enable-banner 从初始加载残留到全屏/overlay/none 模式）
      const currentWallpaperMode = isPostPage
        ? "banner"
        : document.documentElement.getAttribute("data-wallpaper-mode");
      if (currentWallpaperMode !== "banner") {
        bodyElement!.classList.remove("enable-banner");
        bodyElement!.classList.add("no-banner-layout");
        if (currentWallpaperMode === "overlay") {
          bodyElement!.classList.add("wallpaper-transparent");
        } else {
          bodyElement!.classList.remove("wallpaper-transparent");
        }
      }
```

替换为：

```js
      // 同步壁纸模式的 body 类（防止 enable-banner 从初始加载残留到全屏/overlay/none 模式）
      const currentWallpaperMode = isPostPage
        ? "banner"
        : document.documentElement.getAttribute("data-wallpaper-mode");
      if (isPostPage) {
        // 文章页：确保 post-page-banner 类，移除 enable-banner 和 no-banner-layout
        bodyElement!.classList.remove("enable-banner", "no-banner-layout");
        bodyElement!.classList.add("post-page-banner");
      } else if (currentWallpaperMode !== "banner") {
        bodyElement!.classList.remove("enable-banner", "post-page-banner");
        bodyElement!.classList.add("no-banner-layout");
        if (currentWallpaperMode === "overlay") {
          bodyElement!.classList.add("wallpaper-transparent");
        } else {
          bodyElement!.classList.remove("wallpaper-transparent");
        }
      } else {
        // 非文章页 banner 模式：清理 post-page-banner 残留
        bodyElement!.classList.remove("post-page-banner");
      }
```

- [ ] **Step 2: 验证类型检查**

运行：`pnpm check`
预期：PASS

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: visit:start 钩子区分文章页 body 类

- feat: 文章页切换时应用 post-page-banner 类
- fix: 非文章页切换时清理 post-page-banner 残留"
```

---

## Task 5: 修改 Swup `visit:start` 钩子桌面端 wallpaper-wrapper 处理（新增 none 分支）

**Files:**
- Modify: `src/layouts/Layout.astro:1182-1204`（`visit:start` 钩子桌面端 wallpaper-wrapper 处理）

- [ ] **Step 1: 在桌面端分支新增 `none` 模式处理（第 1196-1203 行之间）**

将第 1196-1203 行：

```js
          // 桌面端横幅模式：统一用banner高度定位，不改变grid transform
          if (visitDesktopMode === "banner") {
            mainContentWrapper.style.setProperty("top", "calc(var(--banner-height) - 3.5rem)", "important");
            mainContentWrapper.style.position = "";
            mainContentWrapper.style.zIndex = "";
            mainContentWrapper.style.setProperty("margin-top", "0", "important");
          }
```

替换为：

```js
          // 桌面端横幅模式：统一用banner高度定位，不改变grid transform
          if (visitDesktopMode === "banner") {
            mainContentWrapper.style.setProperty("top", "calc(var(--banner-height) - 3.5rem)", "important");
            mainContentWrapper.style.position = "";
            mainContentWrapper.style.zIndex = "";
            mainContentWrapper.style.setProperty("margin-top", "0", "important");
          }
          // 桌面端 none 模式非文章页：主内容紧跟导航栏，无空白
          if (visitDesktopMode === "none") {
            mainContentWrapper.style.setProperty("top", "5.5rem", "important");
            mainContentWrapper.style.position = "";
            mainContentWrapper.style.zIndex = "";
            mainContentWrapper.style.setProperty("margin-top", "0", "important");
          }
```

- [ ] **Step 2: 验证类型检查**

运行：`pnpm check`
预期：PASS

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "fix: visit:start 桌面端 none 模式定位主内容

- fix: none 模式非文章页主内容 top 设为 5.5rem"
```

---

## Task 6: 修改 Swup `content:replace` 钩子（新增 none 模式分支）

**Files:**
- Modify: `src/layouts/Layout.astro:965-1003`（`content:replace` 钩子）

- [ ] **Step 1: 在 `content:replace` 钩子中新增 `none` 模式非文章页处理（第 997-1003 行之后）**

将第 997-1003 行：

```js
      // 桌面端横幅模式：统一用banner高度定位，不改变grid transform
      if (!isMobileForBanner && currentMode === "banner" && mainEl) {
        mainEl.style.setProperty("top", "calc(var(--banner-height) - 3.5rem)", "important");
        mainEl.style.position = "";
        mainEl.style.zIndex = "";
        mainEl.style.setProperty("margin-top", "0", "important");
      }
```

替换为：

```js
      // 桌面端横幅模式：统一用banner高度定位，不改变grid transform
      if (!isMobileForBanner && currentMode === "banner" && mainEl) {
        mainEl.style.setProperty("top", "calc(var(--banner-height) - 3.5rem)", "important");
        mainEl.style.position = "";
        mainEl.style.zIndex = "";
        mainEl.style.setProperty("margin-top", "0", "important");
      }

      // 桌面端 none 模式非文章页：主内容紧跟导航栏，无空白
      if (!isMobileForBanner && currentMode === "none" && mainEl && !isPostPage) {
        mainEl.style.setProperty("top", "5.5rem", "important");
        mainEl.style.position = "";
        mainEl.style.zIndex = "";
        mainEl.style.setProperty("margin-top", "0", "important");
      }
```

- [ ] **Step 2: 验证类型检查**

运行：`pnpm check`
预期：PASS

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "fix: content:replace 新增 none 模式非文章页定位

- fix: 桌面端 none 模式非文章页主内容 top 设为 5.5rem"
```

---

## Task 7: 修改 Swup `page:view` 钩子（区分文章页 body 类 + 新增 none 分支）

**Files:**
- Modify: `src/layouts/Layout.astro:1256-1264`（`page:view` 钩子 `currentMode === "banner"` 分支）
- Modify: `src/layouts/Layout.astro:1335-1341`（`page:view` 钩子桌面端 banner 模式定位）

- [ ] **Step 1: 修改 `page:view` 钩子中 `currentMode === "banner"` 分支（第 1256-1264 行）**

将第 1256-1264 行：

```js
      if (currentMode === "banner") {
        if (pageBannerEnabled) {
          document.body.classList.add("enable-banner");
          document.body.classList.remove("no-banner-layout");
        } else {
          document.body.classList.remove("enable-banner");
          document.body.classList.add("no-banner-layout");
        }
      }
```

替换为：

```js
      if (currentMode === "banner") {
        if (isPostPage) {
          // 文章页：使用 post-page-banner 类，与 enable-banner 解耦
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

- [ ] **Step 2: 在 `page:view` 钩子桌面端 banner 模式定位后新增 none 模式处理（第 1335-1341 行之后）**

将第 1335-1341 行：

```js
        // 桌面端横幅模式：统一用banner高度定位，不改变grid transform
        if (!isMobileForBanner && currentMode === "banner" && mainEl) {
          mainEl.style.setProperty("top", "calc(var(--banner-height) - 3.5rem)", "important");
          mainEl.style.position = "";
          mainEl.style.zIndex = "";
          mainEl.style.setProperty("margin-top", "0", "important");
        }
```

替换为：

```js
        // 桌面端横幅模式：统一用banner高度定位，不改变grid transform
        if (!isMobileForBanner && currentMode === "banner" && mainEl) {
          mainEl.style.setProperty("top", "calc(var(--banner-height) - 3.5rem)", "important");
          mainEl.style.position = "";
          mainEl.style.zIndex = "";
          mainEl.style.setProperty("margin-top", "0", "important");
        }

        // 桌面端 none 模式非文章页：主内容紧跟导航栏，无空白
        if (!isMobileForBanner && currentMode === "none" && mainEl && !isPostPage) {
          mainEl.style.setProperty("top", "5.5rem", "important");
          mainEl.style.position = "";
          mainEl.style.zIndex = "";
          mainEl.style.setProperty("margin-top", "0", "important");
        }
```

- [ ] **Step 3: 验证类型检查**

运行：`pnpm check`
预期：PASS

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: page:view 区分文章页 body 类并修复 none 模式

- feat: 文章页应用 post-page-banner 类
- fix: none 模式非文章页主内容 top 设为 5.5rem"
```

---

## Task 8: 修改 `MainGridLayout.astro` 主内容区 div 的类名应用条件

**Files:**
- Modify: `src/layouts/MainGridLayout.astro:364`（主内容区 div）

- [ ] **Step 1: 在 frontmatter 中新增 `mainContentLayoutClass` 计算（在第 151 行 `finalMainPanelTop` 之后）**

打开 `src/layouts/MainGridLayout.astro`，找到第 150-151 行：

```js
const finalMainPanelTop =
	isBannerMode && effectiveBackgroundEnabled ? mainPanelTop : "5.5rem";
```

在其后（第 152 行）新增：

```js

// 文章页使用独立的 post-page-banner 类（由 Layout.astro 添加），不加 no-banner-layout
const isPostPageBannerLayout = isPostPage && effectiveBackgroundEnabled;
const mainContentLayoutClass = isPostPageBannerLayout
	? ""
	: (isBannerMode && effectiveBackgroundEnabled)
		? ""
		: "no-banner-layout";
```

- [ ] **Step 2: 修改主内容区 div 的类名应用（第 364 行）**

将第 364 行：

```astro
<div class={`absolute w-full z-30 pointer-events-none ${mobileNonHomeBannerClass ? 'mobile-main-no-banner' : ''} ${!(isBannerMode && effectiveBackgroundEnabled) ? 'no-banner-layout' : ''}`} style={isFullscreenMode && effectiveBackgroundEnabled ? 'top: 0;' : `top: ${finalMainPanelTop}`}>
```

替换为：

```astro
<div class={`absolute w-full z-30 pointer-events-none ${mobileNonHomeBannerClass ? 'mobile-main-no-banner' : ''} ${mainContentLayoutClass}`} style={isFullscreenMode && effectiveBackgroundEnabled ? 'top: 0;' : `top: ${finalMainPanelTop}`}>
```

- [ ] **Step 3: 验证类型检查**

运行：`pnpm check`
预期：PASS

- [ ] **Step 4: Commit**

```bash
git add src/layouts/MainGridLayout.astro
git commit -m "refactor: 主内容区类名改用 mainContentLayoutClass

- refactor: 文章页不加 no-banner-layout 类
- refactor: 提取 mainContentLayoutClass 计算逻辑"
```

---

## Task 9: 完整构建验证 & 视觉检查

**Files:**
- 无文件改动，仅验证

- [ ] **Step 1: 运行完整检查链**

运行：

```bash
pnpm check
pnpm lint
pnpm format
```

预期：全部 PASS（`pnpm format` 可能会格式化之前修改的文件，这是正常的）

- [ ] **Step 2: 运行完整构建**

运行：`pnpm build`
预期：构建成功，无错误

- [ ] **Step 3: 启动预览服务器进行视觉检查**

运行：`pnpm preview`
预期：服务器启动

- [ ] **Step 4: 验证 `mode: "none"` 下文章详情页**

在浏览器中访问任意文章详情页，检查：
1. banner 图片正常显示
2. 文章标题、日期、字数等元信息覆盖在 banner 上，无重叠
3. 导航栏透明效果正常
4. 主内容区位于 banner 下方，无空白
5. body 元素应有 `post-page-banner` 类，无 `enable-banner` 和 `no-banner-layout` 类

- [ ] **Step 5: 验证 `mode: "none"` 下非文章页**

在浏览器中访问首页、归档页、分类页、标签页，检查：
1. 导航栏与下方内容之间无大片空白
2. 主内容紧跟导航栏下方
3. 无 wallpaper-wrapper 残留空间
4. body 元素应有 `no-banner-layout` 类，无 `post-page-banner` 和 `enable-banner` 类

- [ ] **Step 6: 验证页面切换（Swup）**

在浏览器中：
1. 从文章页点击返回首页 → 检查无闪烁、无残留 `post-page-banner` 类
2. 从首页点击进入文章页 → 检查 `post-page-banner` 类正确应用
3. 在文章页之间切换 → 检查布局保持一致

- [ ] **Step 7: 验证其他模式不受影响**

临时修改 `src/config/backgroundWallpaper.ts` 中的 `mode` 为：
1. `mode: "banner"` → 所有页面行为应与改动前一致
2. `mode: "fullscreen"` → 所有页面行为应与改动前一致
3. `mode: "overlay"` → 所有页面行为应与改动前一致

每次修改后运行 `pnpm dev` 检查，验证完成后改回 `mode: "none"`

- [ ] **Step 8: 验证移动端响应式**

在浏览器开发者工具中切换到移动端视图（< 1024px），检查：
1. 文章详情页 banner 显示正常
2. 非文章页主内容紧跟导航栏
3. 无横向滚动条

- [ ] **Step 9: 最终 Commit（如有 format 改动）**

```bash
git add -A
git commit -m "style: 格式化代码

- style: 应用 Biome 格式化"
```

---

## 自检

**1. Spec 覆盖**：
- ✓ 3.1 文章页独立 CSS 类 `.post-page-banner` → Task 1
- ✓ 3.2 非文章页修复空白 → Task 1（CSS）+ Task 5/6/7（JS）
- ✓ 4.1.1 `enableBanner` 逻辑 → Task 2
- ✓ 4.1.2 body `class:list` → Task 2
- ✓ 4.1.3 内联脚本 `applyWallpaperMode` → Task 3
- ✓ 4.1.4 Swup `visit:start` 钩子 → Task 4 + Task 5
- ✓ 4.1.5 Swup `content:replace` 钩子 → Task 6
- ✓ 4.1.6 Swup `page:view` 钩子 → Task 7
- ✓ 4.2 `MainGridLayout.astro` → Task 8
- ✓ 4.3 `layout-styles.css` → Task 1
- ✓ 七、验证要点 → Task 9

**2. 占位符扫描**：无 TBD/TODO，所有步骤包含完整代码。

**3. 类型一致性**：
- `forceArticleBanner` 在 Task 2/3 中使用，变量名一致 ✓
- `post-page-banner` CSS 类名在所有 Task 中一致 ✓
- `isPostPage` 在 Swup 钩子中一致使用 ✓
- `mainContentLayoutClass` 在 Task 8 中定义并使用 ✓

**4. 命名一致性检查**：
- `WALLPAPER_NONE`/`WALLPAPER_BANNER` 等常量在 Task 3 中保持原样 ✓
- `currentMode`/`currentWallpaperMode`/`visitDesktopMode` 变量名与现有代码一致 ✓
