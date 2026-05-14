# 藏珠 Margarita

拥抱"少即是多"的生活。用 Margarita 盘点所有物，清楚自己拥有什么，才知道真正需要什么。

Margarita 是一款专注于个人实物资产管理与消费反思的跨平台桌面应用。通过量化"拥有"的真实成本，帮助你从物品维度审视生活，养成理性消费和长期珍惜物品的习惯。

## 技术栈

| 层 | 技术 |
|:---|:---|
| 桌面框架 | Tauri 2.x |
| 前端 | React 18 + TypeScript + Tailwind CSS 4 |
| 状态管理 | Zustand |
| 路由 | React Router (内存模式) |
| 图表 | Recharts |
| 后端 | Rust |
| 数据库 | SQLite (rusqlite) |
| 国际化 | i18next + react-i18next |
| 测试 | Vitest + React Testing Library |

## 功能

- **物品管理** — 添加、编辑、删除物品，支持网格/列表视图，搜索筛选排序
- **固定资产与折旧** — 直线折旧法 / 加速折旧法，净值计算，维持期管理
- **成本分析** — 日均成本、次均成本、总投入（购买价 + 维护支出）
- **仪表盘** — 资产总值/净值概览，品类占比，购买趋势
- **使用打卡** — 每日打卡，日历热力图
- **时间线** — 物品生命周期事件记录（维修、保养、借出等）
- **闲置清单** — 闲置检测、沉默成本计算、CSV 导出
- **后悔榜** — 基于评分、闲置天数、净值折损的后悔指数排名
- **消费决策** — 愿望清单（冷却期）、不买计算器（闲置资产匹配）
- **多语言** — 简体中文 / 繁體中文 / English，即时切换
- **数据主权** — 本地 SQLite 存储，手动备份恢复，无强制云同步

## 开发环境要求

- Node.js 22+
- Rust 1.95+ (GNU 工具链)
- npm 或 yarn

Windows 用户需要 MinGW-w64 工具链（通过 Chocolatey 安装）：

```bash
choco install mingw -y
```

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/badliuyichao/Margarita.git
cd Margarita

# 安装前端依赖
npm install

# 启动开发模式（桌面应用）
npx tauri dev

# 或仅启动前端（浏览器访问 http://localhost:5173）
npm run dev
```

## 测试

```bash
# 前端测试
npm test

# Rust 编译检查
cd src-tauri && cargo check

# Rust 测试编译
cargo check --tests
```

## 构建安装包

```bash
npm run build          # 构建前端
npx tauri build        # 构建桌面安装包
```

产物输出至 `src-tauri/target/release/bundle/`：
- Windows: `.msi` + `.exe` (NSIS)
- macOS: `.dmg`

## 项目结构

```
Margarita/
├── src/                        # React 前端
│   ├── api/                    # Tauri IPC 封装 + Mock 数据
│   ├── components/             # UI 组件
│   │   └── common/             # 通用组件
│   ├── pages/                  # 页面组件
│   ├── stores/                 # Zustand 状态管理
│   ├── i18n/                   # 语言文件 (zh-CN / zh-TW / en)
│   ├── test/                   # 前端测试
│   └── utils/                  # 工具函数
├── src-tauri/                  # Rust 后端
│   └── src/
│       ├── db/                 # 数据库操作 (8 张表)
│       ├── commands/           # Tauri 命令 (IPC)
│       ├── engine/             # 计算引擎 (折旧/闲置/后悔/冷却)
│       ├── services/           # 服务 (备份/图片)
│       ├── tests/              # Rust 测试
│       └── utils/              # 工具 (错误类型/格式化)
├── doc/                        # 项目文档
│   ├── design/                 # 设计文档 (PRD/PDD/概要/详细/数据字典)
│   └── dev/                    # 开发文档 (计划/进度)
└── .github/workflows/          # CI/CD
```

## 数据存储

| 平台 | 路径 |
|:---|:---|
| Windows | `%LocalAppData%\com.margarita.app\` |
| macOS | `~/Library/Application Support/com.margarita.app/` |

数据库文件 `margarita.db` 与图片 `images/` 目录。可通过设置页面查看路径或在文件管理器中打开。

## 许可证

[AGPL-3.0](LICENSE)
