# `/categories/` 页面结构分析

## 概述

`/categories/` 是博客的**分类标签**聚合页面，以**可视化**和**列表**两种方式展示文章分类与标签关系。页面主体分为两大区域：**分类玫瑰图**（下半部分为**标签关系图谱**）。

---

## 路由文件

**路径**: `src/pages/categories.astro`

职责：接收数据并组合布局，内容极薄，实际渲染全部委托给子组件。

### 数据获取

| 数据 | 来源函数 | 返回类型 | 说明 |
|---|---|---|---|
| `categories` | `getCategoryList()` | `Category[]` | 按文章数量降序排列的分类列表 |
| `tagGraph` | `getTagGraphData()` | `TagGraphData` | 标签节点与共现边数据 |

---

## 页面布局结构

```
MainGridLayout (全站主布局)
  └── div.categories-page (Card 容器)
      ├── div.categories-page__header
      │   └── PageTitle (title="分类标签", eyebrow="Taxonomy", variant="stacked")
      ├── CategoryRose (分类玫瑰图 + 列表)
      ├── div.categories-page__divider (分隔线)
      └── TagGraph (标签关系图谱)
```

---

## 组件详解

### 1. PageTitle — 通用页面标题

**路径**: `src/components/common/PageTitle.astro`

通用标题组件，展示：
- 主标题：`分类标签`
- 副标题（eyebrow）：`Taxonomy`
- variant：`stacked`（上下排列）

---

### 2. CategoryRose — 分类玫瑰图 + 列表

**路径**: `src/components/widget/CategoryRose.astro`

#### 数据结构

```typescript
type Category = {
  name: string;   // 分类名称
  count: number;  // 该分类下的文章数量
  url: string;    // 链接到 /archive/?category=xxx
};
```

#### 渲染内容

- **左侧**：ECharts 玫瑰图（南丁格尔玫瑰图）
  - 扇形半径 `["20%", "75%"]`，`roseType: "area"`
  - 每个扇区 = 一个分类，面积代表文章数量
  - 悬停 tooltip 显示分类名、文章数、占比
  - 点击跳转到 `/archive/?category=xxx`
  - 支持**暗色模式**（通过 MutationObserver 监听 `class` 变化）
  - ECharts 通过 CDN 延迟加载（`cdn.jsdelivr.net/npm/echarts@5.6.0`）
  - 动画：入场 `scale` 效果，逐项延迟 100ms

- **右侧**：分类列表
  - `<a>` 链接列表，跳转到 `/archive/?category=xxx`
  - 显示 **分类名** + **文章数量**
  - Hover 效果：字体放大、颜色变为主色、左侧内边距增加
  - 底部汇总行：`共 N 篇文章`

#### 生命周期

| 事件 | 行为 |
|---|---|
| `astro:page-load` | 初始化图表 |
| `swup:contentReplaced` | 重新初始化 |
| `swup:willReplaceContent` | 销毁 chart 实例，清理 resize/observer |

---

### 3. TagGraph — 标签关系图谱

**路径**: `src/components/widget/TagGraph.astro`

#### 数据结构

```typescript
type TagGraphData = {
  nodes: TagGraphNode[];  // 标签节点列表
  links: TagGraphLink[];  // 标签共现边列表
  threshold: number;      // 共现边显示阈值（默认 2）
};

type TagGraphNode = {
  id: string;         // 标签名（唯一标识）
  name: string;       // 显示名称
  value: number;      // 该标签下的文章数量
  url: string;        // 链接到 /archive/?tag=xxx
  posts: TagGraphPost[];  // 该标签下的文章列表（用于 tooltip）
};

type TagGraphLink = {
  source: string;     // 源节点 ID
  target: string;     // 目标节点 ID
  value: number;      // 共现次数
};
```

#### 标签分类（显示在 tooltip / legend）

| 条件 | 类别 | 说明 |
|---|---|---|
| `value >= 5` | 高频标签 | 文章量大的核心标签 |
| `value >= 2` | 常用标签 | 中等频率标签 |
| `value < 2` | 低频标签 | 使用较少的标签 |

#### 渲染内容

- **标题区**：`标签关系图谱` + `N 个标签`
- **主体**：ECharts 力导向图（`type: "graph", layout: "force"`）
  - **节点** = 标签：圆点大小正比于文章数（`24px ~ 78px`）
  - **边** = 标签共现关系：线宽正比于共现频次
  - 可拖拽、缩放（`roam: true`）
  - 点击节点跳转到 `/archive/?tag=xxx`
  - 悬停高亮（`focus: "adjacency"`）：聚焦节点+相邻节点，其余灰化（blur）
  - 支持**暗色模式**（MutationObserver 监听 class 变化）

#### 生命周期

与 CategoryRose 相同，额外引入了 `window.__tagGraphPageListenerBound` 标志防止重复绑定。

---

## 数据来源

### `getCategoryList()` — `src/utils/content-utils.ts:115`

1. 通过 `getAllPosts()` 获取全部文章
2. 遍历文章，统计每个 `post.data.category` 的数量
3. 未设置分类的文章归入 `"未分类"`
4. 按文章数量**降序**排列，数量相同则按名称字母序
5. 通过 `getCategoryUrl()` 生成链接 → `/archive/?category=xxx`

### `getTagGraphData()` — `src/utils/content-utils.ts:89`

1. 通过 `getAllPosts()` 获取全部文章
2. 调用 `buildTagGraphData()`（`src/utils/tag-graph-data.ts:62`）
   - 遍历文章，提取 `tags` 数组
   - 为每个标签创建节点，统计文章数量
   - 为每对标签（共现在同一篇文章中）创建边，统计共现次数
3. 默认共现阈值 = 2（共现少于 2 次不显示连线）
4. 通过 `getTagUrl()` 为每个节点生成链接 → `/archive/?tag=xxx`

### URL 生成 — `src/utils/url-utils.ts`

| 函数 | 生成路径 |
|---|---|
| `getCategoryUrl(category)` | `/archive/?category=xxx` 或 `/archive/?uncategorized=true` |
| `getTagUrl(tag)` | `/archive/?tag=xxx` |

---

## 样式

**路径**: `src/styles/pages/categories.css`

- `.categories-page`：Card 容器，圆角，溢出隐藏
- `.categories-page__divider`：分隔线（`1px solid --line-divider`）
- `.category-rose__layout`：Flexbox 响应式布局
  - 桌面端：图表左 (flex:1) + 列表右 (200px)
  - 移动端 (≤768px)：上下排列
- `.tag-graph__chart`：固定高度 620px（响应式递减至 360px），含 1px 边框和圆角
- `.tag-card` / `.tag-card-wall`：标签卡片墙样式（定义了但当前页面**未使用**，可能是预留）

---

## 依赖与外部资源

| 依赖 | 用途 |
|---|---|
| ECharts 5.6.0 (CDN) | 玫瑰图、力导向图渲染 |
| `src/utils/content-utils.ts` | 分类统计、标签图数据生成 |
| `src/utils/tag-graph-data.ts` | 标签共现图构建算法 |
| `src/utils/url-utils.ts` | 分类/标签的 URL 生成 |
| `src/components/widget/CategoryRose.astro` | 分类玫瑰图组件 |
| `src/components/widget/TagGraph.astro` | 标签关系图谱组件 |
| `src/styles/pages/categories.css` | 页面专属样式 |
| `src/layouts/MainGridLayout.astro` | 页面主布局壳 |

---

## 交互行为总结

| 交互 | 组件 | 行为 |
|---|---|---|
| 点击分类名/扇区 | CategoryRose | 跳转 `/archive/?category=xxx` |
| 点击标签节点 | TagGraph | 跳转 `/archive/?tag=xxx` |
| 悬停扇区 | CategoryRose | Tooltip 显示名称、数量、占比 |
| 悬停节点/边 | TagGraph | Tooltip 显示名称、数量（边显示共现次数） |
| 悬停节点 | TagGraph | 高亮相邻节点与边，其余灰化 |
| 拖拽节点 | TagGraph | 改变力导向图布局 |
| 滚轮缩放 | TagGraph | 缩放/平移 |
| 暗色模式切换 | 两者 | MutationObserver 自动重算颜色 |