# AGENTS.md — 低空交通监测系统

本文件是给 AI 编码助手与协作者的工程约定。与 `C:\ai\fireweb` 保持一致的风格基线。

## 项目定位

**纯前端演示项目**，无后端、无数据库、无接口联调。全部数据来自 `src/mock/`，不得引入真实网络请求。
唯一的外部网络依赖是高德栅格瓦片底图，且已做断网降级（见「地图」一节）。

## 技术栈（不要替换）

| 项 | 选型 | 备注 |
| --- | --- | --- |
| 框架 | Vue 3.4 + Vite 5 | `<script setup>`，不用 Options API |
| 路由 | vue-router 4，**hash 模式** | `createWebHashHistory` |
| 状态 | Pinia 2 | 组合式写法，导出 `useXxxStore` |
| 地图 | Leaflet 1.9 | 唯一的地图依赖，不加别的 |
| 图表 | ECharts 5，按需引入 | 只注册用到的图表与组件 |
| 样式 | 原生 CSS + CSS 变量 | **禁止** Tailwind / less / sass / CSS-in-JS |
| UI 库 | **无** | 组件全部手写 |
| 类型 | **无 TypeScript** | 纯 JS |

## 代码风格（硬约束）

- 两空格缩进
- 单引号
- **不写分号**
- 多行结构保留尾逗号
- 组件文件 PascalCase，如 `EventDetailCard.vue`
- 页面统一 `views/XxxView.vue`
- store 文件小写，导出 `useXxxStore`
- 展示文案集中放在 `src/domain/constants.js` 的 `*_LABEL` 里，不要在组件里散写中文枚举

## 目录职责

```
src/
  domain/constants.js   枚举 + 标签映射 + 配色 + 地图视野 + 航线/空域参数 + 角色权限矩阵。魔法值先来这里找
  utils/                纯函数：格式化、坐标系转换、地图图标工厂、空域多边形、CSV 导出
  mock/                 手写 mock 数据 + geometry/hash 纯函数；index.js 是唯一对外出口，并带外键自检
  stores/               Pinia；筛选管线 + 航线/空域 CRUD + 审批流转 + 取证校验都在 monitor.js；
                        app.js 管角色与权限
  composables/          useLeafletMap（地图生命周期）、useChart（ECharts 生命周期）
  components/common/    跨页面复用的原子件（含 DataTable 表格、ModalDialog 弹窗）
  components/map/       地图、图例、航线预览图、空域预览图
  components/overview/  监测总览的左栏三卡 + 右栏两卡
  components/stat/      统计分析页的图表容器
  views/                MonitorView（三栏总览）· AirspaceView / RoutesView / TasksView / DataView（四个表格页）
                        · EvidenceView（存证链）· StatView（统计分析）
  styles/               tokens.css（设计令牌）→ base.css（基类）
```

## 数据约定

- **`src/mock/tasks.js` 是「无人机 ↔ 航线」绑定关系的唯一来源**（`task.droneId` / `task.routeId`）。
  无人机的 `taskId` 与当前位置由 `src/mock/index.js` 派生，不要在两个文件里各写一份。
- 新增数据后必须跑 `npm run check:data`，外键断裂会直接报错退出。
- 业务坐标一律按 **GCJ-02** 书写（与高德瓦片同源），锚点统一放在 `src/mock/anchors.js`。

## 筛选逻辑（改动前务必读）

`src/stores/monitor.js` 里 `filteredTasks` 是**唯一**的筛选管线，顺序为：

```
事件作用域（activeEventId） → 下拉筛选（类型/状态/机队/区） → 关键词
```

其余列表（`mapTasks` / `mapDrones` / `mapRoutes` / `mapMissionAreas` / `filteredEvents` / `manageRows`）
**全部由它派生**，不允许另起一套过滤条件，否则各处列表会不同步。

两套条件的清空互相独立：
- 事件 chip 上的 `×` → `clearEvent()`，只清 `activeEventId`
- 筛选栏的「重置」 → `resetFilters()`，只清 `filters`

## 地图（改动前务必读）

1. **Leaflet 实例必须放在 `shallowRef`**，绝不能进 `reactive` 或深层 `ref`，否则内部状态被 Proxy 包裹会出问题。
2. 只初始化一次，`onBeforeUnmount` 必须 `map.remove()`；hash 路由来回切后要 `invalidateSize()`，
   否则容器尺寸为 0 会渲染成灰块。
3. 图层按类分组（`layerGroups`），筛选变化时只 `clearLayers()` 后重加，**不要重建地图**。
4. 底图坐标是 GCJ-02，本地 GeoJSON 也是 GCJ-02（已用「黄浦江=浦东/黄浦界」实测比对确认）。
   若换用 WGS-84 数据源，把 `constants.js` 的 `GEO_SOURCE_CRS` 改成 `'wgs84'`，加载时会自动转换。
5. 瓦片挂了不能白屏：本地 `shanghai.json` 的区界与区名始终渲染，`tileerror` 累计到阈值会出降级提示。

### 新增一个业务图层要改 5 处

`constants.js` 的 `MAP_LAYERS`（`MapLegend` 由它派生，顺序即图例顺序）·
`useLeafletMap.js` 的 `layerGroups`（`addBusinessLayers` 自动建组）·
`monitor.js` 的 `layers` ref · `MapLegend.vue` 的 `counts` · `MonitorMap.vue` 的 `render*()` + watch。

**`render*()` 里必须检查 `store.layers[key]`** —— `renderEvents` 那个漏检的写法不要模仿，
它是历史遗留，导致事件图层无法开关。

多边形配色必须是 **hex**：Leaflet 的 SVG 渲染器不解析 CSS 变量，写 `var(--danger)` 会渲染成黑色。

## 表格页（改动前务必读）

`AirspaceView` / `RoutesView` / `TasksView` / `DataView` 四页共用 `components/common/DataTable.vue`：

- 列定义是 `{ key, label, width, align }` 数组，每个 `key` 对应一个具名插槽用于自定义单元格；
  没有对应插槽时按纯文本渲染
- 表格设了 `min-width`，窄屏靠容器横向滚动，**不要**改成压缩列宽
- 支持写操作的页面：**航线规划**（航线增删改）、**空域管理**（空域增删改）、
  **任务执行**（任务审批四态流转）。数据管理只读；取证存证只提供「校验」这一个动作
- 派发任务、归档数据、上传下载都需要后端支撑，不做假动作

### 航线 CRUD 的硬约束

1. `path` 与 `distanceKm` 是 `anchors` 的**派生值**。改锚点必须同步重算——
   `updateRoute` 里已强制调用 `resolveRouteGeometry`，新增航线时也要走同一条路径，
   否则地图画的还是旧轨迹。
2. **被任务引用的航线不允许删除**（`tasksUsingRoute(routeId)` 非空时禁用删除按钮），
   否则 `task.routeId` 会指向一条不存在的航线，`check:data` 直接报外键错误。
3. 新建的航线**不会**出现在监测总览地图上——总览只画「有任务在执行」的航线，
   避免把还没派任务的航线误显示为在飞。要看新航线用航线规划页右侧的预览地图。
4. 增删改只存在内存（Pinia），**刷新页面即恢复初始 20 条**。这是纯前端演示的固有边界，
   不要试图用 localStorage 补持久化。

### 空域、审批与权限的硬约束

1. **空域多边形是「中心点 + 半径 + 边数 + 类型」的派生值。** 生成逻辑在
   `utils/airspace.js` 的 `buildAirspacePolygon`，store 与空域页的表单预览**共用同一个函数**；
   分两处实现会导致「表单里预览的形状」和「保存后的形状」对不上。
2. **审批只扩展字段，绝不新增任务。** `TASKS.length === ROUTES.length` 是硬约束，
   新建任务必然要配新航线。所以任务执行页不提供「新建任务」入口。
3. **审批状态与执行状态正交。** 审批通过**不**把 `pending` 改成 `executing`——
   「准飞许可」和「调度状态」是两回事。一旦联动，`mapTasks`、KPI、`busy` 约束会全部跟着变。
4. **权限绝不进入 `filteredTasks`。** 权限只作用于数据资产可见性（`DataView` 的 `visibleRows`）
   与写操作显隐（`app.can()`）。一旦进筛选管线，会出现「同一任务在总览可见、在数据页不可见」的割裂，
   而且 `manageRows` 的 Tab 计数会与独立页表格行数对不上。
5. **密级比较必须用 `app.maxAccessRank`（数字），不能用 `app.maxAccessLevel`（字符串）。**
   `1 <= 'restricted'` 会因 NaN 恒为 false，把所有数据都过滤掉。
6. 空域是**管制规则**不是任务产物，所以 `mapAirspaces` 全量展示、不随任务筛选变化；
   审批的 `approvalRecords` 追加时用不可变替换（`tasks.value = tasks.value.map(...)`）。

### 预览地图是独立实例

`components/map/RoutePreviewMap.vue` 不复用 `useLeafletMap`，因为它只画一条航线，
而复用总览那个会把筛选管线、图层开关等状态一起带过来。它同样遵守地图那一节的五条铁律。
瓦片地址统一取自 `constants.js` 的 `AMAP_TILE_URL`，不要在两处各写一遍。

## 常用命令

```bash
start.bat            # 一键启动（Windows 双击运行，自动装依赖 + 开浏览器）
npm run dev          # 开发服务器，端口 5174（strictPort）
npm run build        # 生产构建
npm run preview      # 预览构建产物
npm run check:data   # mock 数据外键一致性自检（改数据后必跑）
```

## Windows 启动脚本（改动前务必读）

`start.bat` 位于项目根目录，双击即用。它依赖两条**硬约束**：

1. **必须 CRLF 换行，不能是 LF**。bat 的 `goto` 与标签在 LF 换行下会解析失败，
   报「系统找不到指定的批标签」。用编辑器或 AI 工具改写该文件后，**务必确认换行符仍是 CRLF**
   （多数工具的默认写入是 LF，会静默破坏这个文件）。
2. **必须 UTF-8 无 BOM**，首行 `chcp 65001 >nul` 负责把代码页切到 UTF-8 以正确显示中文。
   带 BOM 会导致第一行 `@echo off` 报「不是内部或外部命令」。

脚本内的 `PORT` 变量需与 `vite.config.js` 的 `server.port` 保持一致（当前 5174）。
端口被占用时脚本会列出 PID 并询问是否结束，不会静默杀掉进程。

## 交付要求

改动完成后至少做到：

1. `npm run check:data` 通过
2. `npm run build` 零报错
3. 浏览器实跑走查：默认态 → 点事件筛选 → 切三个 Tab → 清除事件 → 叠加下拉筛选 → 统计分析页 → 返回总览，
   控制台应零错误
