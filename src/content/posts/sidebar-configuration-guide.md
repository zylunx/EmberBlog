---
title: Ember 侧边栏配置指南
published: 2026-07-18T00:00:00.000Z
description: 介绍 Ember 博客侧边栏的组件定义、默认布局、页面覆盖、路径匹配、组件复用和关闭规则。
slug: sidebar-configuration-guide
image: https://img.zylun.de5.net/file/EasyCoverPlus/1784338451808.avif
tags:
  - Ember
  - Astro
  - 侧边栏
  - 配置
category: 技术分享
draft: false
ai: >-
  Ember 的侧边栏配置分为组件实例库、默认布局和页面布局三部分。组件是否显示由布局数组是否引用其 ID 决定；页面可以部分覆盖默认布局、用空数组关闭单个区域，或用 false 关闭整页侧边栏。配置支持精确路径和末尾星号前缀匹配，并允许组件在不同区域复用。
---

Ember 的侧边栏配置位于 `src/config/sidebarConfig.ts`。它把“组件如何配置”和“每个页面显示哪些组件”分开管理，避免在左栏、右栏和移动端重复维护同一份组件配置。

## 一、配置结构

侧边栏配置由三部分组成：

1. `components`：保存所有可用的组件实例。
2. `default`：定义大多数页面使用的默认布局。
3. `pages`：按页面路径覆盖默认布局。

简化后的结构如下：

```ts
export const sidebarLayoutConfig = {
  enable: true,
  tabletSidebar: "left",
  components: sidebarComponents,
  default: {
    left: [],
    right: ["profile", "tags", "calendar"],
    mobileBottom: ["announcement", "categories", "tags"],
  },
  pages: {
    "/about": false,
    "/posts/*": {
      right: ["sidebarToc", "tags"],
    },
  },
};
```

## 二、定义组件实例

每个组件实例都有一个唯一 ID。例如下面的 `tags` 是组件 ID，`type: "tags"` 表示它使用标签组件：

```ts
const sidebarComponents = {
  tags: {
    type: "tags",
    position: "sticky",
    specificConfig: {
      collapseThreshold: 10,
    },
  },
};
```

常用配置项如下：

| 配置项 | 作用 |
| --- | --- |
| `type` | 组件类型，例如 `profile`、`tags`、`calendar` |
| `position` | 左右栏中的位置：`top` 或 `sticky` |
| `showTitle` | 是否显示卡片标题，默认显示 |
| `specificConfig` | 当前组件的专属配置 |
| `customProps` | 预留的组件扩展配置，仅在对应组件支持时生效 |

目前支持的组件类型包括：

- `profile`：个人资料。
- `announcement`：站点公告。
- `categories`：文章分类。
- `tags`：文章标签。
- `stats`：站点统计。
- `sidebarToc`：文章目录。
- `calendar`：文章日历。
- `advertisement`：广告卡片。
- `siteInfo`：站点信息。

组件定义中没有 `enable`。一个组件只有被布局数组引用时才会渲染；保留未引用的定义不会让它出现在页面中。

## 三、组件位置与顺序

`position` 有两个值：

- `top`：显示在侧栏顶部，不随页面滚动吸附。
- `sticky`：显示在粘性区域，可随页面滚动吸附。

布局数组决定同一个位置分组内部的顺序，但所有 `top` 组件仍会整体显示在 `sticky` 组件之前。

移动端底部区域会忽略 `position`，完全按照 `mobileBottom` 数组的顺序显示。

## 四、默认布局

`default` 包含三个区域：

```ts
default: {
  left: [],
  right: ["profile", "tags", "calendar"],
  mobileBottom: ["announcement", "categories", "tags"],
},
```

- `left`：非移动端布局的左侧栏。
- `right`：非移动端布局的右侧栏。
- `mobileBottom`：移动端正文下方的组件区域。

数组中的值必须是 `components` 中已经定义的组件 ID。空数组表示不显示该区域。

同一个组件 ID 可以在不同区域复用。例如 `tags` 可以同时出现在右栏和移动端底部：

```ts
default: {
  left: [],
  right: ["tags"],
  mobileBottom: ["tags"],
},
```

## 五、页面级布局

`pages` 用页面路径作为键。页面配置只覆盖写出的区域，没有写出的区域继续继承 `default`。

### 关闭整个页面的侧边栏

```ts
pages: {
  "/about": false,
},
```

`/about` 和 `/about/` 都会命中这条规则，左右栏和移动端底部都会关闭。

### 只修改一个区域

```ts
pages: {
  "/posts/*": {
    right: ["sidebarToc", "tags"],
  },
},
```

文章页的右栏会改为文章目录和标签。因为没有填写 `left` 与 `mobileBottom`，这两个区域会继承默认布局。

### 只关闭某个区域

```ts
pages: {
  "/gallery": {
    right: [],
  },
},
```

空数组只关闭对应区域，不会影响其他区域。

### 为页面启用双侧栏

```ts
pages: {
  "/archive": {
    left: ["profile"],
    right: ["categories", "tags"],
  },
},
```

当最终布局中的 `left` 和 `right` 都有组件时，页面会自动使用双侧栏，不需要额外配置布局模式。

## 六、路径匹配规则

页面规则支持两种写法：

- 精确路径：`"/about"`。
- 前缀路径：`"/posts/*"`，星号只能放在末尾。

匹配顺序如下：

1. 精确路径优先。
2. 没有精确匹配时，使用命中的最长前缀。
3. 没有任何页面规则命中时，使用 `default`。

例如：

```ts
pages: {
  "/posts/*": {
    right: ["sidebarToc"],
  },
  "/posts/tutorials/*": {
    right: ["sidebarToc", "categories", "tags"],
  },
  "/posts/tutorials/start": false,
},
```

访问 `/posts/tutorials/start` 时使用精确规则并关闭侧边栏；访问其他教程文章时使用更长的 `/posts/tutorials/*` 规则。

## 七、全局与单篇文章开关

顶层 `enable` 是侧边栏总开关：

```ts
enable: false,
```

设为 `false` 后，所有页面都会关闭侧边栏，`pages` 不能重新开启它。

单篇文章还可以在 frontmatter 中关闭侧边栏：

```yaml
---
title: 示例文章
sidebar: false
---
```

`sidebar: false` 只影响当前文章。它同样只能关闭侧边栏，不能覆盖全局或页面级的关闭规则。

## 八、同类型组件的不同配置

如果同一种组件需要多套配置，应创建不同的组件 ID：

```ts
const sidebarComponents = {
  statsTop: {
    type: "stats",
    position: "top",
  },
  statsSticky: {
    type: "stats",
    position: "sticky",
  },
};
```

广告组件也适合使用这种方式。可以预先保留多套广告定义，只把需要显示的广告 ID 放入布局数组。未引用的广告不会渲染，也不会执行广告脚本或消耗显示次数。

## 九、当前默认效果

当前配置的实际效果是：

- 普通页面：右栏显示个人资料、标签和日历。
- 文章页面：右栏显示文章目录和标签。
- 移动端：正文底部显示公告、分类和标签。
- 关于页面：关闭所有侧边栏区域。
- `adBanner`、`adSupport` 等未被布局引用的组件：保留配置但不显示。

修改配置后，建议运行以下命令检查类型和格式：

```bash
pnpm check
pnpm format
```
