# 天天打卡正式产品返工 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有近似原型返工为严格对齐 Figma、可离线安装和公开分享的正式 V1.1 产品。

**Architecture:** 保留纯函数数据规则层，重写 DOM 渲染和 CSS。所有正式图标与视觉位图保存在 `assets/figma/`，页面状态由本地存储和显式 UI 状态驱动。

**Tech Stack:** HTML5、CSS、原生 JavaScript ES Modules、Service Worker、Node Test、GitHub Pages。

## Global Constraints

- Figma 正式区 `179:1453` 是唯一视觉基准。
- 393px 做 1:1 验收，360px 和桌面做响应适配。
- 禁止字符图标和近似占位资源。
- 首次进入必须是零任务、零打卡、零勋章。
- 不增加账号、后端、云同步、照片证明、等级或排行榜。

---

### Task 1: Figma 资源与视觉令牌

**Files:**
- Create: `assets/figma/*.svg`
- Create: `assets/figma/*.png`
- Modify: `styles.css`

**Interfaces:**
- Produces: `--color-*`、`--radius-*`、`--shadow-*` 和正式资源路径。

- [ ] 导出首页、导航、任务、记录、成功和分享页面使用的 SVG/PNG。
- [ ] 校验全部资源 HTTP 200、SVG 可解析、PNG 非空。
- [ ] 在 CSS 中建立与 Figma 一致的颜色、字体、圆角和阴影令牌。
- [ ] 运行 `node --check app.js`，确认资源重构未破坏脚本。

### Task 2: 日期选择数据接口

**Files:**
- Modify: `core.mjs`
- Modify: `tests/core.test.mjs`

**Interfaces:**
- Produces: `getTasksForDate(state, date)` 和 `getDateTaskStatus(state, taskId, date)`。

- [ ] 添加过去、今天、未来日期状态测试。
- [ ] 运行 `node --test tests/core.test.mjs` 并确认新增测试先失败。
- [ ] 实现最小日期查询接口。
- [ ] 再次运行测试并确认全部通过。

### Task 3: Figma 首页与日期切换

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes: Task 1 资源与 Task 2 日期接口。
- Produces: `ui.selectedDate`、空首页、周/月日期选择和对应任务列表。

- [ ] 按节点 `147:89` 实现首次空首页。
- [ ] 按节点 `106:124` 实现有任务首页。
- [ ] 实现周视图与月视图日期选择。
- [ ] 验证切换日期后标题、任务和操作入口同步变化。

### Task 4: 任务、打卡和记录流程

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

**Interfaces:**
- Produces: 发布、编辑、确认、记录、补卡和撤销完整页面状态。

- [ ] 对齐节点 `147:491`、`149:933`、`151:1226`、`153:451`、`156:821`。
- [ ] 使用 Figma 图标替换全部字符符号。
- [ ] 验证今天直接打卡、历史补卡、撤销和二次确认。

### Task 5: 勋章、奖励、分享和个人信息

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

**Interfaces:**
- Produces: 成功、点亮、勋章、个人信息、奖励和分享页面。

- [ ] 对齐节点 `112:1818`、`179:1460`、`147:662`、`179:1909`、`156:991`、`172:1800`。
- [ ] 验证勋章注水、回退、奖励归档、海报生成和文案复制。

### Task 6: PWA 与发布配置

**Files:**
- Modify: `index.html`
- Modify: `manifest.webmanifest`
- Modify: `sw.js`
- Create: `.github/workflows/pages.yml`

**Interfaces:**
- Produces: 可安装、离线和 GitHub Pages 可发布应用。

- [ ] 使用正式 192px/512px 图标更新 Manifest。
- [ ] 缓存全部正式运行时资源并提升缓存版本。
- [ ] 增加 GitHub Pages 静态发布工作流。
- [ ] 停止服务器后重载验证离线可用。

### Task 7: 文档收口

**Files:**
- Modify: `README.md`
- Modify: `docs/天天打卡-产品开发交付文档.md`
- Move: 历史 PRD 和规则文档到 `docs/archive/`

**Interfaces:**
- Produces: 唯一正式文档入口和清晰历史归档。

- [ ] README 只保留产品简介、体验、开发和正式文档链接。
- [ ] 归档旧文档并修复链接。
- [ ] 检查现役文档不存在互相矛盾的首次流程。

### Task 8: 两轮验收与发布

**Files:**
- Modify: `tests/core.test.mjs`

**Interfaces:**
- Produces: 可核验的本地与线上正式版本。

- [ ] 第一轮使用干净存储验证首次空首页、建任务和打卡。
- [ ] 第二轮验证日期切换、补卡、撤销、奖励、归档和分享。
- [ ] 在 393x851、360x800 和桌面检查布局与控制台。
- [ ] 对 13 个页面建立 Figma 与实现截图差异清单并修复。
- [ ] 使用已登录 Chrome 上传代码、启用 GitHub Pages 并验证公开链接。

