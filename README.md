# 天天打卡

面向家庭的轻量学习打卡 PWA。家长创建任务，孩子通过每日打卡、勋章成长和家庭奖励回应获得持续反馈。

当前发布版本为 `1.2.17`，实现 [V1.1 产品规格](./docs/天天打卡_V1.1_PRD.md)。视觉以 [Figma 天天打卡](https://www.figma.com/design/fms7qDu4GjPsyWlEXG5tnh/%E5%A4%A9%E5%A4%A9%E6%89%93%E5%8D%A1?node-id=106-71) 的 13 个主流程画板和首次空首页为准。

在线体验：https://gz-gu.github.io/tiantian-checkin/

## 功能

- 首次打开为零任务、零打卡的空首页。
- 周视图和月视图可切换日期；当天全部任务完成后才显示完成状态，过去日期支持补卡，未来日期只读。
- 支持直接打卡、补卡原因、撤销原因、记录追溯和勋章进度回退。
- 达成目标后由家长确认奖励，任务随后归档。
- 支持头像切换、勋章注水、庆祝动效、分享海报和本地离线使用。
- 数据仅保存在当前设备，不包含账号、云同步、照片证明、等级或排行榜。

## 本地运行

```bash
python3 -m http.server 4186 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4186/`。不要直接双击 `index.html`，Service Worker 需要通过 HTTP 或 HTTPS 运行。

## 测试

```bash
node --test tests/core.test.mjs
```

浏览器验收覆盖 393 x 851 和 360 x 800，包括首次空状态、创建任务、打卡、补卡、撤销、奖励归档、分享海报和离线刷新。

## 文档

- [产品开发交付文档](./docs/天天打卡-产品开发交付文档.md)：开发、运行、测试、部署和安装说明。
- [视觉验收报告](./docs/figma-baseline/视觉验收报告-1.2.15.md)：Figma节点、截图、差异和浏览器验收结果。
- [V1.1 产品规格](./docs/天天打卡_V1.1_PRD.md)：现役业务规则。
- `docs/archive/`：早期探索文档，仅供追溯，不作为开发依据。
- `docs/superpowers/`：本次正式版设计说明与实施计划。

## 代码结构

- `index.html`、`styles.css`、`app.js`：页面、样式和交互。
- `core.mjs`：可测试的数据规则层。
- `assets/figma/`：Figma 正式切图和图标。
- `assets/fonts/`：阿里巴巴普惠体 2.0。
- `manifest.webmanifest`、`sw.js`：PWA 安装与离线缓存。
- `.github/workflows/pages.yml`：GitHub Pages 自动部署。
