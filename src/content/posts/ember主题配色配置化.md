---
title: Ember 主题配色配置化：移除访客取色器，统一由站点配置驱动
published: 2026-07-15T00:00:00.000Z
description: 记录 Ember 博客从访客自定义主题色迁移到构建配置色的过程，包括双模式色板派生、文章配色覆盖、旧存储清理与构建校验。
tags:
  - Ember
  - Astro
  - 主题
  - 配色
  - TypeScript
category: 技术分享
slug: ember-config-driven-theme-colors
image: https://img.zylun.de5.net/file/blog/1784106848406.avif?
draft: false
ai: >-
  本文记录 Ember 博客主题配色系统的一次收敛改造：删除右上角访客取色器、旧 themeColor 配置及颜色持久化逻辑，改用
  siteConfig.style.color.main/dark 分别定义浅色和深色主色，并为两种模式独立派生完整色板。同时保留深浅模式切换、文章
  frontmatter color 覆盖与文章列表布局设置，对旧 localStorage 配色键进行自动清理，并通过严格 Hex 校验、Astro Check
  和完整构建保证迁移可靠。
color: "#434885"
---

## 📖 改造背景

Ember 原有的主题系统允许访客在右上角的显示设置面板中调整主题色。颜色会被转换成强调色和色相，并写入 `localStorage`，随后由首屏脚本、主题工具函数和 Swup 页面切换逻辑共同恢复。

这套方案虽然灵活，但也带来了几个问题：

- 主题颜色的来源不唯一：站点配置、文章配置和访客存储可能同时生效。
- 首屏需要读取多组颜色存储键，初始化链路较长。
- 显示设置面板混合了配色与文章列表布局两类功能。
- 修改默认配色后，旧访客仍可能继续看到浏览器中保存的历史颜色。
- 浅色与深色模式共用一个全局色相，无法真正配置两套独立颜色。

这次改造的目标很明确：**颜色由站点维护者在配置文件中确定，访客只负责选择浅色、深色或跟随系统。**

---

## 🎯 最终规则

改造后的主题系统遵循以下规则：

1. 全局主题色只读取 `siteConfig`，不再允许访客修改。
2. 浅色和深色模式分别配置颜色，并独立派生对应色板。
3. 保留浅色、深色、跟随系统三种模式及用户的模式偏好。
4. 保留文章 frontmatter 中的 `color`，进入文章时仍可覆盖全局配色。
5. 旧配色存储会自动清除，不再提供兼容回退。
6. 颜色只接受 `#RGB` 或 `#RRGGBB`，非法配置直接终止构建。
7. 显示设置入口只在允许切换文章列表布局时出现。

---

## ⚙️ 新配置结构

旧配置把色相、取色器开关和默认模式都放在 `themeColor` 中：

```ts
themeColor: {
  hue: 290,
  fixed: false,
  defaultMode: "system",
},
```

新配置将“视觉样式”和“模式选择”拆开：

```ts
style: {
  color: {
    main: "#3b82f6",
    dark: "#60a5fa",
  },
},

theme: {
  defaultMode: "system",
},
```

其中：

- `style.color.main`：浅色模式主色。
- `style.color.dark`：深色模式主色。
- `theme.defaultMode`：默认使用 `light`、`dark` 或 `system`。

类型层使用模板字面量约束颜色必须以 `#` 开头：

```ts
export type HexColor = `#${string}`;
```

模板字面量只能完成基础约束，因此运行时还会继续解析颜色，确保内容确实是三位或六位 Hex。

---

## 🧮 两种模式独立派生色板

主色不仅用于链接和按钮，还会影响页面背景、悬停状态、选中状态、目录和卡片表面等颜色。只替换 `--primary` 会导致主色与其他界面颜色脱节，因此需要从配置色生成一组主题 token。

`deriveThemeColorTokens()` 会分别解析 `main` 和 `dark`：

```ts
const themeColorTokens = deriveThemeColorTokens(
  siteConfig.style.color.main,
  siteConfig.style.color.dark,
);
```

派生结果包含：

- 两种模式的原始强调色。
- 两种模式各自的 OKLCH 色相。
- 两种模式各自的表面彩度参数。
- 适合显示在强调色背景上的黑色或白色前景色。

如果颜色无法解析，构建会收到明确错误：

```ts
if (!mainOklch) {
  throw new Error(
    `siteConfig.style.color.main 必须是 #RGB 或 #RRGGBB，当前值：${JSON.stringify(main)}`,
  );
}
```

这样可以避免拼错颜色后悄悄回退到旧配色，使配置问题在部署前就暴露出来。

---

## 🎨 CSS 变量如何切换

为了让深浅模式切换时无需重新执行颜色计算，CSS 同时保存两套变量：

```stylus
:root
  --hue-light: var(--config-hue-light, 250)
  --hue-dark: var(--config-hue-dark, 250)
  --hue: var(--hue-light)
  --accent-light: var(--config-accent-light, #3b82f6)
  --accent-dark: var(--config-accent-dark, #60a5fa)
  --primary: var(--accent-light)

:root.dark
  --hue: var(--hue-dark)
  --primary: var(--accent-dark)
```

浅色模式使用 `main` 对应的主色和色相；根元素获得 `.dark` 后，CSS 自动切换到 `dark` 对应的变量。

这种结构允许两种模式使用完全不同的色相。例如浅色模式可以使用蓝色，深色模式也可以改成紫色，而不是只能在同一色相上调整亮度。

首屏阻塞脚本会在页面绘制前写入配置 token，因此不会先显示回退色再发生闪烁：

```js
rootStyle.setProperty("--config-accent-light", themeColorMain);
rootStyle.setProperty("--config-accent-dark", themeColorDark);
rootStyle.setProperty("--config-hue-light", String(themeHueMain));
rootStyle.setProperty("--config-hue-dark", String(themeHueDark));
```

---

## 🧹 清理旧访客配色

旧版曾将原始颜色和派生结果分别写入浏览器。迁移后如果只停止读取，这些数据仍会长期残留，也可能被未来代码误用。

因此首屏初始化时会主动删除以下键：

```js
for (const storageKey of [
  "hue",
  "accentLight",
  "accentDark",
  "onAccentLight",
  "onAccentDark",
  "accentSat",
]) {
  localStorage.removeItem(storageKey);
}
```

这里不会删除 `theme`。访客选择的浅色、深色或跟随系统仍然属于有效偏好，需要继续保留。

---

## 📝 保留文章级颜色覆盖

文章 frontmatter 的 `color` 与访客全局取色器是两种不同能力：前者由内容作者控制，用于让文章页面和封面形成一致的视觉氛围；后者由访客在运行时修改全站颜色。

因此这次只删除访客取色器，文章颜色仍然保留。

构建文章页面时，会继续从文章颜色得到 `pageHue`，并生成亮色、深色强调色以及对应的前景色。数据通过 `MainGridLayout` 写入页面容器：

```astro
data-page-hue={hue}
data-page-accent-light={pageAccentLight}
data-page-accent-dark={pageAccentDark}
data-page-on-accent-light={pageOnAccentLight}
data-page-on-accent-dark={pageOnAccentDark}
```

进入文章时，这些变量以 `important` 优先级覆盖全局配置；通过 Swup 离开文章后，内联覆盖会被移除，页面自然恢复 `style.color.main/dark`。

---

## 🧩 导航栏与显示设置收敛

原显示设置面板同时包含主题取色器和文章列表布局切换。删除取色器后，面板只剩布局设置，因此导航栏的渲染规则也一并调整：

- `postListLayout.allowSwitch: false`：不渲染显示设置按钮和面板。
- `postListLayout.allowSwitch: true`：显示布局设置入口，只提供列表与网格切换。
- 深浅模式按钮始终独立保留。

同时删除了以下不再需要的内容：

- 废弃的 `DisplaySettings.svelte` 色相面板。
- `ConfigCarrier.astro` 旧色相传递组件。
- 五种语言中的“主题色相”文案。
- 色相滑块使用的渐变 CSS 变量。
- `setting-utils.ts` 中的颜色读取、写入和默认色相函数。

---

## 🖼️ Open Graph 配色同步

Open Graph 图片过去直接读取 `themeColor.hue`，如果只改页面主题而忽略这里，分享图仍会依赖已经删除的配置。

现在 OG 图片同样调用 `deriveThemeColorTokens()`，使用深色主色作为强调色，并从深色模式色相派生背景与次要文字色。页面与分享卡片因此使用同一份配置来源。

---

## ✅ 验证结果

改造完成后执行了以下检查：

```bash
pnpm check
pnpm format
pnpm build
```

结果如下：

- Astro Check：154 个文件，`0 errors`、`0 warnings`、`0 hints`。
- Formatter：执行成功。
- 完整构建：成功生成 24 个页面。
- 首页生成 HTML 中不再包含配色设置按钮和面板。
- 深浅模式按钮仍正常渲染。
- 配置的 `#3b82f6` 与 `#60a5fa` 已进入首屏主题变量。

构建期间图片取色脚本有 4 个远程图片请求失败，但脚本按设计跳过，未影响主题迁移和最终构建。

---

## 💡 总结

这次改造并不是简单地隐藏一个按钮，而是重新明确了主题颜色的所有权：

- **站点配置**负责全局品牌色。
- **深浅模式**负责选择当前使用哪套颜色。
- **文章 frontmatter**负责局部页面氛围。
- **访客存储**只保存模式偏好，不再保存配色数据。

颜色来源从多层运行时状态收敛为构建配置后，首屏初始化、页面切换和后续维护都更容易推理；同时保留文章级视觉表达，也没有牺牲原有的深浅模式体验。
