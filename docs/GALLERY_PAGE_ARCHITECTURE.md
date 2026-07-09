# 画廊/相册页面架构文档

本文档详细记录了 `/gallery/` 页面的完整架构、技术栈、文件结构及实现细节，帮助你从头复刻该功能。

---

## 目录

1. [功能概述](#1-功能概述)
2. [技术栈](#2-技术栈)
3. [文件清单](#3-文件清单)
4. [数据流与架构](#4-数据流与架构)
5. [配置系统](#5-配置系统)
6. [路由与页面](#6-路由与页面)
7. [组件详解](#7-组件详解)
8. [样式系统](#8-样式系统)
9. [客户端交互](#9-客户端交互)
10. [国际化](#10-国际化)
11. [复刻步骤](#11-复刻步骤)
12. [附录：外部依赖](#12-附录外部依赖)

---

## 1. 功能概述

Gallery 页面提供两种相册模式：

| 模式 | 说明 |
|------|------|
| **本地相册** | 将图片存放在 `public/gallery/<album-id>/` 目录下，通过配置文件声明相册元信息，构建时静态扫描生成页面。支持按标签筛选、悬停卡片动画、点击进入相册详情（瀑布流布局）、Fancybox 灯箱预览。 |
| **网络相册** | 通过 Svelte 组件调用外部 API (`t.alcy.cc/json`) 随机获取图片，支持分类选择和数量控制，5 秒冷却防刷。 |

---

## 2. 技术栈

| 技术 | 用途 |
|------|------|
| **Astro 6** | 静态页面生成、路由、布局、ISR |
| **Svelte 5** | 交互组件（PhotoCard 懒加载、NetworkAlbum 数据获取） |
| **Tailwind CSS 4** | 基础布局样式 |
| **CSS** | 自定义动画、相册卡片、瀑布流、标签筛选指示器 |
| **TypeScript** | 类型定义、工具函数 |
| **Fancybox (v5)** | 图片灯箱预览（延迟加载、手势操作） |
| **Iconify + astro-icon** | 图标系统 |
| **Swup** | 页面过渡（整站 SPA 化，Gallery 需在导航后重新初始化） |

---

## 3. 文件清单

```
src/
├── config/
│   └── galleryConfig.ts          # 相册配置（相册列表、瀑布流列宽、网络相册参数）
├── types/
│   └── config.ts                 # GalleryAlbum、GalleryConfig 类型定义
├── pages/
│   └── gallery/
│       ├── index.astro           # 相册列表首页（Tab 切换 + 标签筛选 + 相册卡片网格）
│       └── [album].astro         # 单个相册详情页（封面横幅 + 瀑布流照片网格）
├── components/
│   ├── common/
│   │   ├── Icon.astro            # Astro 端图标组件
│   │   └── Icon.svelte           # Svelte 端图标组件（构建时内联 SVG）
│   └── pages/
│       └── gallery/
│           ├── AlbumCard.astro   # 相册卡片（悬停 3D 翻转效果、标签、照片数）
│           ├── PhotoCard.svelte   # 单张照片（IntersectionObserver 懒加载 + Fancybox 绑定）
│           └── NetworkAlbum.svelte # 网络相册（API 请求、分类/数量控制、图片网格）
├── utils/
│   └── gallery-utils.ts          # 扫描相册图片、获取封面图的工具函数
├── styles/
│   └── pages/
│       └── gallery.css           # 所有 Gallery 相关自定义样式（70% 样式在此）
├── layouts/
│   ├── Layout.astro              # 外层壳（注入 FancyboxManager）
│   └── MainGridLayout.astro      # 主布局（导航栏、搜索、页脚等）
├── features/
│   └── FancyboxManager.astro     # Fancybox 灯箱管理器（延迟加载 + Swup 生命周期绑定）
├── i18n/
│   ├── i18nKey.ts                # 国际化键名定义（gallery、galleryDescription 等 13 个键）
│   └── languages/*.ts            # 多语言翻译（zh_CN、en、ja、ru、zh_TW）
└── config/
    └── siteConfig.ts             # pages.gallery 开关（true/false）

public/
└── gallery/
    └── <album-id>/               # 相册图片目录（如 ai-2026/、mc-2026/）
        ├── cover.*               # 可选封面（自动识别，不填则用第一张图）
        ├── 1.webp
        ├── 2.webp
        └── ...
```

---

## 4. 数据流与架构

### 4.1 构建时数据流（本地相册）

```
galleryConfig.ts
    └─ albums[] 数组（id, name, description, date, location, tags, cover）
            │
            ▼
gallery/index.astro
    ├─ scanAlbumPhotos(album.id) → 读取 public/gallery/<id>/ 目录
    │     过滤 jpg/png/webp/avif/gif，排序，cover.* 优先
    │     返回图片 URL 数组
    ├─ getAlbumCover(album, photos) → 手动指定 > cover.* > 第一张
    └─ 传给 AlbumCard 组件渲染
            │
            ▼
gallery/[album].astro  (getStaticPaths 为每个 album 生成静态页)
    ├─ scanAlbumPhotos(albumId) → 读取该相册所有图片
    ├─ getAlbumCover → 封面图
    └─ 传给 PhotoCard 组件渲染瀑布流
```

### 4.2 运行时数据流（网络相册）

```
NetworkAlbum.svelte
    ├─ 用户选择 Category + Quantity
    ├─ 点击 "Random Fetch" 按钮
    ├─ fetch(`https://t.alcy.cc/json?${category}=${quantity}`)
    ├─ 解析返回的 JSON（{ code: 200, data: [...] }）
    ├─ 渲染图片网格
    ├─ 每张图片通过 data-fancybox 绑定 Fancybox 灯箱
    └─ 5 秒冷却倒计时（禁用按钮防刷）
```

---

## 5. 配置系统

### 5.1 类型定义 (`src/types/config.ts`)

```typescript
export type GalleryAlbum = {
  id: string;          // URL slug + 目录名，如 "japan-2025"
  name: string;        // 相册名称
  description?: string;
  date?: string;       // 日期，格式 "YYYY-MM-DD"
  location?: string;   // 拍摄地点
  tags?: string[];     // 标签（首页筛选用）
  cover?: string;      // 手动指定封面路径（可选）
};

export type GalleryConfig = {
  albums: GalleryAlbum[];
  columnWidth?: number;       // 瀑布流最小列宽(px)，默认 240
  networkAlbum?: {
    maxQuantity?: number;     // 单次获取上限，默认 10
    defaultQuantity?: number; // 默认数量，默认 6
  };
};
```

### 5.2 配置文件 (`src/config/galleryConfig.ts`)

示例：

```typescript
export const galleryConfig: GalleryConfig = {
  albums: [
    {
      id: "ai-2026",
      name: "祖国人",
      description: "逆天AI生图",
      date: "2026-05-06",
      location: "沃特公司",
      tags: ["AI", "祖国人"],
      // cover: 可选，不填自动取 cover.* 或第一张
    },
    // ... 更多相册
  ],
  columnWidth: 240,
  networkAlbum: {
    maxQuantity: 10,
    defaultQuantity: 6,
  },
};
```

### 5.3 页面开关 (`src/config/siteConfig.ts`)

```typescript
pages: {
  gallery: true,  // false 时 /gallery/ 路由重定向到 404
}
```

---

## 6. 路由与页面

### 6.1 路由表

| 路由 | 文件 | 说明 |
|------|------|------|
| `/gallery/` | `src/pages/gallery/index.astro` | 相册列表首页 |
| `/gallery/:album/` | `src/pages/gallery/[album].astro` | 单个相册详情页 |

### 6.2 相册列表首页 (`index.astro`)

**核心逻辑：**

1. 检查 `siteConfig.pages.gallery`，若关闭则 `Astro.redirect("/404/")`
2. 读取 `galleryConfig.albums`，对每个 album：
   - `scanAlbumPhotos(album.id)` → 扫描图片列表
   - `getAlbumCover(album, photos)` → 获取封面
   - 合并数据传给 `AlbumCard`
3. 收集所有相册的标签去重 → 生成筛选栏
4. 渲染两个 Tab 区域（本地相册 / 网络相册）
5. 内联 `<script>` 处理 Tab 切换动画（滑动指示器）和标签筛选

**Tab 切换机制（Vanilla JS）：**
- `data-gallery-tab` 标识按钮，`data-gallery-section` 标识面板
- 点击按钮：切换 active class、移动指示器（计算 offsetLeft/width）、切换面板显隐
- 通过 `window.location.hash` 支持深链接（`#gallery-network`）
- 事件委托挂载在 `document` 上，Swup 导航后自动生效

**标签筛选机制：**
- `data-gallery-filter` 容器内 `.tools-tab-btn` 按钮
- 点击筛选按钮：更新 active 状态、移动指示器、遍历 `.album-card`
- 根据 `card.dataset.tags` 判断显隐（comma-separated string）
- 显示时触发 `galleryFadeInUp` 动画

### 6.3 相册详情页 (`[album].astro`)

**核心逻辑：**

1. `getStaticPaths()` → 遍历 `galleryConfig.albums` 生成静态页
2. 解析 `Astro.params.album` 匹配 `albumMeta`
3. `scanAlbumPhotos(albumId)` → 获取图片列表
4. 渲染：
   - 封面横幅（`aspect-[3/1]`，渐变蒙层 + 元信息）
   - 返回按钮（链接到 `/gallery/`）
   - 瀑布流网格（CSS multi-column layout）

**瀑布流实现：**
```css
.gallery-masonry {
  column-width: var(--col-width, 240px);
  column-count: 2;        /* 移动端 2 列；640px+ 变为 auto */
  column-gap: 0.75rem;
}
```
配合 `PhotoCard` 的 `break-inside-avoid` 防止跨列断裂。

---

## 7. 组件详解

### 7.1 AlbumCard.astro — 相册卡片

| Props | 类型 | 说明 |
|-------|------|------|
| id | string | 相册 ID |
| name | string | 相册名称 |
| cover | string | 封面图 URL |
| description | string? | 描述 |
| date | string? | 日期 |
| location | string? | 地点 |
| tags | string[]? | 标签 |
| photoCount | number | 照片数量 |

**交互效果：**
- 悬停时卡片底部展开（`bottom: 10px → 80px`），露出名称/日期/地点
- 装饰性伪元素旋转效果（`::before` 旋转 20deg，`::after` 旋转 10deg）
- 图片 hover scale 放大
- 右上角照片数 badge 和左下角标签在悬停时淡出
- 整个卡片是一个 `<a>` 链接到 `/gallery/{id}/`
- `data-tags` 属性用于首页标签筛选

### 7.2 PhotoCard.svelte — 单张照片（Svelte 5）

| Props | 类型 | 说明 |
|-------|------|------|
| src | string | 图片 URL |
| albumId | string | 所属相册 ID |
| alt | string | 替代文本 |

**特性：**
- **IntersectionObserver 懒加载**：`rootMargin: "200px"`，进入视口 200px 前开始加载
- **骨架屏过渡**：加载前显示 pulse 动画占位块，加载完成后淡出、图片淡入
- **加载错误**：显示图片损坏图标
- **Fancybox 绑定**：通过 `data-fancybox="gallery-{albumId}"` 实现组灯箱
- 使用 Svelte 5 `$state`/`$effect` 响应式语法

### 7.3 NetworkAlbum.svelte — 网络相册（Svelte 5）

**UI 控件：**
- 分类下拉选择器（PC / AI / AI MP / BD / FJ / FJ MP / LAI / Moe / Moe MP / MP / TX / XHL / YS / YS MP）
- 数量输入框（1 ~ maxQuantity）
- 随机获取按钮（含加载状态、冷却倒计时）

**数据请求：**
```typescript
const url = `https://t.alcy.cc/json?${category}=${quantity}`;
// 示例：https://t.alcy.cc/json?pc=6
```
- 响应格式：`{ code: 200, data: [{ id, link }] }`
- 5 秒冷却倒计时（禁用按钮、显示秒数、红色脉冲动画）
- 错误显示红色提示条

**图片渲染：**
- CSS Grid `auto-fill, minmax(200px, 1fr)` 自适应网格
- 悬停缩放 + 遮罩 + 放大镜图标
- 全部通过 `data-fancybox="network-gallery"` 绑定灯箱

---

## 8. 样式系统

样式分布在三个位置：

### 8.1 全局自定义 CSS (`src/styles/pages/gallery.css`)

集中了所有 Gallery 相关样式：

- **Tab 导航指示器动画**：`left + width transition`
- **Tab 按钮颜色**：active/inactive/hover 状态
- **卡片淡入动画**：`galleryFadeInUp` keyframes
- **瀑布流布局**：`column-width / column-count` 响应式
- **AlbumCard 完整样式**：
  - 卡片容器固定 `254px` 高度
  - `::before/::after` 伪元素旋转装饰
  - 图片容器 `top: 10px` 布局，hover 时 `bottom: 80px` 展开
  - 详细信息从底部滑入

### 8.2 Tailwind CSS

用于基础布局：
- 卡片网格 `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`
- 封面横幅 `aspect-[3/1]`、渐变蒙层
- 间距、圆角、文字大小等

### 8.3 Svelte Scoped Style

`NetworkAlbum.svelte` 中使用 `<style>` 标签定义 scoped 样式：
- 控制栏、下拉框、输入框、按钮、错误提示、图片网格
- 暗色模式兼容（`:root.dark` 选择器）

---

## 9. 客户端交互

### 9.1 Gallery Tab 切换

在 `index.astro` 的内联 `<script>` 中实现（IIFE，通过 `window.__galleryReady` 防重复注册）：

| 功能 | 机制 |
|------|------|
| Tab 点击切换 | 事件委托 `document click → [data-gallery-tab]` |
| 滑动指示器 | 计算按钮 offsetLeft/offsetWidth → 设置 indicator 的 left/width |
| Hash 恢复 | `hashchange` 事件 + 初始化读取 `#gallery-*` |
| Resize 重算 | `window resize` 事件更新指示器位置 |
| Swup 兼容 | `astro:page-load` 事件重新初始化 |

### 9.2 Gallery Filter 标签筛选

| 功能 | 机制 |
|------|------|
| 标签点击筛选 | 事件委托 `document click → [data-gallery-filter] .tools-tab-btn` |
| 指示器定位 | 计算 offsetLeft/offsetTop/offsetWidth/offsetHeight |
| 卡片显隐 | 遍历 `.album-card`，匹配 `data-tags` 属性 |
| 淡入动画 | `.gallery-card-fade-in` class 触发 keyframe |

### 9.3 Fancybox 灯箱

全局在 `Layout.astro` 中加载 `FancyboxManager.astro`：

- **延迟加载**：检查页面是否存在 `[data-fancybox]` 或图片元素，无则不加载
- **动态导入**：`import("@fancyapps/ui")` 按需加载
- **配置项**：缩略图、工具栏（缩放/旋转/翻转）、键盘快捷键、手势关闭
- **三个绑定选择器**：
  - 文章内图片：`.custom-md img`（groupAll 模式）
  - 显式 `data-fancybox` 标记：Gallery 用的
  - 外部链接 `data-fancybox` 属性
- **Swup 兼容**：`swup:visit:start` 关闭/解绑 → `swup:content:replace` 重新绑定
- **MutationObserver**：监听动态插入的 `[data-fancybox]` 元素（Svelte `client:visible` 水合后自动绑定）

### 9.4 PhotoCard 懒加载

使用 IntersectionObserver（rootMargin 200px）实现图片懒加载 + 骨架屏过渡。

---

## 10. 国际化

在 `src/i18n/` 中定义了 13 个 Gallery 相关键：

| 键名 | 用途 |
|------|------|
| `gallery` | 页面标题 |
| `galleryDescription` | 页面描述 |
| `galleryPhotos` | "张照片" |
| `galleryAlbums` | "本相册" |
| `galleryNoAlbums` | "暂无相册" |
| `galleryBackToAlbums` | "返回相册列表" |
| `galleryLocalAlbum` | "本地相册" |
| `galleryNetworkAlbum` | "网络相册" |
| `galleryCategory` | "分类" |
| `galleryQuantity` | "数量" |
| `galleryRandomFetch` | "随机获取" |
| `galleryFetching` | "获取中..." |
| `galleryFetchError` | "获取失败，请重试" |
| `galleryNoImages` | "暂无图片，点击上方按钮随机获取" |

支持语言：简体中文、繁体中文、英文、日文、俄文。

---

## 11. 复刻步骤

### 11.1 前提条件

- Node.js >= 22
- pnpm >= 9
- Astro 6 + Tailwind CSS 4 项目

### 11.2 安装依赖

```bash
# Fancybox 灯箱
pnpm add @fancyapps/ui

# Iconify（Astro 端）
pnpm add astro-icon
```

### 11.3 需要创建的文件（按顺序）

| 顺序 | 文件 | 说明 |
|------|------|------|
| 1 | `src/types/config.ts` 中添加 `GalleryAlbum`、`GalleryConfig` 类型 |
| 2 | `src/config/galleryConfig.ts` | 相册配置 |
| 3 | `src/utils/gallery-utils.ts` | 图片扫描 + 封面获取工具 |
| 4 | `src/styles/pages/gallery.css` | 所有自定义样式 |
| 5 | `src/components/pages/gallery/AlbumCard.astro` | 相册卡片 |
| 6 | `src/components/pages/gallery/PhotoCard.svelte` | 单张照片（懒加载） |
| 7 | `src/components/pages/gallery/NetworkAlbum.svelte` | 网络相册 |
| 8 | `src/pages/gallery/index.astro` | 相册列表首页 |
| 9 | `src/pages/gallery/[album].astro` | 相册详情页 |
| 10 | `src/components/features/FancyboxManager.astro` | 灯箱管理器 |
| 11 | `src/layouts/Layout.astro` 中引入 FancyboxManager |
| 12 | `src/i18n/` 中添加翻译键值 |
| 13 | `src/config/siteConfig.ts` 中添加 `pages.gallery` 开关 |

### 11.4 图片目录结构

```
public/gallery/
├── <album-id-1>/        # 第一个相册
│   ├── cover.webp       # 可选封面
│   ├── 1.webp
│   ├── 2.jpg
│   └── ...
├── <album-id-2>/
│   └── ...
└── ...
```

支持的图片格式：`jpg` / `jpeg` / `png` / `webp` / `avif` / `gif`

### 11.5 配置示例

在 `src/config/siteConfig.ts` 中启用：
```typescript
pages: { gallery: true }
```

在导航配置中添加链接。

### 11.6 构建说明

Gallery 页面是静态生成的（SSG），`pnpm build` 会自动：
1. 扫描 `galleryConfig.albums` 生成相册列表页
2. 对每个 album 调用 `getStaticPaths` 生成详情页
3. 扫描 `public/gallery/<id>/` 目录获取图片列表

---

## 12. 附录：外部依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@fancyapps/ui` | ^5 | 图片灯箱预览 |
| `astro-icon` | ^1 | Astro 端图标组件 |
| `@iconify` 生态 | 间接 | Svelte 端图标（通过构建时脚本内联 SVG） |

### 12.1 网络相册 API

- 接口：`https://t.alcy.cc/json?{category}={quantity}`
- 来源：第三方随机图片服务
- 响应格式：`{ code: 200, data: [{ id: string, link: string }] }`
- 可替换：修改 `NetworkAlbum.svelte` 中的 API URL 和响应解析即可接入其他图片源

### 12.2 Fancybox 参考

- 官网：https://fancyapps.com/fancybox/
- GitHub：https://github.com/fancyapps/ui
- 版本：v5（`@fancyapps/ui` npm 包）
- 引入方式：`Layout.astro` 中动态导入，按需加载
