# 📚 小学生每日任务清单 - 微信小程序

> 专为小学生设计的每日任务管理工具，支持作业、阅读、运动等任务管理，并可导出为图片分享。

---

## 🗂 项目结构

```
student-task-miniprogram/
├── app.js                        # 全局逻辑（数据初始化、工具函数）
├── app.json                      # 全局配置（页面路由、tabBar）
├── app.wxss                      # 全局样式
├── sitemap.json
├── project.config.json
├── images/                       # tabBar 图标
│   ├── task.png
│   ├── task-active.png
│   ├── setting.png
│   └── setting-active.png
└── pages/
    ├── index/                    # 今日任务主页
    │   ├── index.js
    │   ├── index.wxml
    │   ├── index.wxss
    │   └── index.json
    ├── task-detail/              # 任务编辑页（含子任务管理）
    │   ├── task-detail.js
    │   ├── task-detail.wxml
    │   ├── task-detail.wxss
    │   └── task-detail.json
    ├── add-task/                 # 新增任务页
    │   ├── add-task.js
    │   ├── add-task.wxml
    │   ├── add-task.wxss
    │   └── add-task.json
    └── settings/                 # 设置页（含导出PDF）
        ├── settings.js
        ├── settings.wxml
        ├── settings.wxss
        └── settings.json
```

---

## ✨ 功能特性

### 📋 今日任务主页（index）
- **进度卡片**：实时显示今日完成进度百分比 + 进度条动画
- **默认6个任务**：语文作业、数学作业、英语作业、课外阅读、运动锻炼、兴趣爱好
- **子任务勾选**：点击子任务打勾/取消，触感反馈（`wx.vibrateShort`）
- **智能完成检测**：所有子任务完成时，主任务自动标记完成并弹出庆祝提示
- **快速操作**：每个任务支持编辑、删除
- **重置今日**：一键清空当天完成记录
- **导出按钮**：顶部导出按钮，生成任务清单图片

### ✏️ 任务编辑页（task-detail）
- **实时预览**：顶部以任务颜色渐变展示当前图标，视觉直观
- **修改任务名称**：最多20字
- **修改预计时间**（分钟）
- **16色可选颜色盘**：点击即切换，颜色联动整个页面渐变
- **16个 emoji 图标选择器**：点击图标区域弹出，选中高亮
- **子任务管理**：
  - 添加子任务（名称 + 预计时间）
  - 编辑已有子任务
  - 删除子任务
  - 上移 / 下移调整顺序
- **保存按钮**：右上角保存，写入本地存储

### ➕ 新增任务页（add-task）
- 图标选择（16个）
- 颜色选择（8色）
- 任务名称 + 预计时间
- 任务分类（作业/学习/运动/兴趣/其他）
- 预设子任务（创建时即可添加）
- 创建后自动返回主页

### ⚙️ 设置页（settings）
- **学生名字编辑**：点击姓名区域直接修改
- **今日统计**：任务数、已完成数、完成百分比
- **导出今日任务清单**（重点功能）：
  - 使用 Canvas 2D API 绘制精美任务卡片图
  - 包含：学生名、日期、星期、进度条、每个任务及子任务的完成状态
  - 保存到手机相册，可直接分享给家长/老师
- **恢复默认任务**：一键还原6个默认任务
- **清除所有数据**：彻底重置

---

## 🚀 快速上手

### 1. 在微信开发者工具中打开

1. 下载安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 点击「导入项目」
3. 选择本项目根目录（`student-task-miniprogram/`）
4. AppID 填写你的小程序 AppID（或选择「测试号」）
5. 点击「导入」即可运行

### 2. 修改 AppID

打开 `project.config.json`，将 `appid` 字段改为你的真实 AppID：

```json
{
  "appid": "wx你的AppID"
}
```

### 3. 替换 tabBar 图标（可选）

`images/` 目录下的图标为占位图（纯色方块），建议替换为实际 81×81px 的 PNG 图标：
- `task.png` / `task-active.png`：任务图标（灰色/蓝色）
- `setting.png` / `setting-active.png`：设置图标（灰色/蓝色）

---

## 📱 数据存储说明

所有数据使用微信本地存储（`wx.getStorageSync` / `wx.setStorageSync`）：

| Key | 内容 |
|-----|------|
| `tasks` | 任务列表数组（含子任务） |
| `studentName` | 学生姓名 |
| `dailyRecord_YYYY-MM-DD` | 每日完成记录（completedIds + subCompletedIds） |

每日记录按日期独立存储，互不干扰，可查看历史。

---

## 📄 导出图片说明

「导出」功能使用 **Canvas 2D API** 在小程序内绘制任务清单：

- 绘制内容：标题、学生名、日期、进度条、每个主任务（含颜色标识）及其子任务完成状态
- 输出：调用 `wx.canvasToTempFilePath` 生成临时图片，再通过 `wx.saveImageToPhotosAlbum` 保存到相册
- 权限：首次导出会请求相册写入权限（`scope.writePhotosAlbum`）

> ⚠️ 微信小程序不支持直接生成 PDF 文件并下载，导出为图片是官方推荐的分享方案。如需 PDF，可将图片通过第三方云函数（如腾讯云 SCF）转换。

---

## 🎨 设计说明

- **主色**：天蓝 `#6EC6F5`（护眼、活泼）
- **背景**：米黄 `#FFF8EC`（温暖不刺眼）
- **任务颜色**：8种可选，区分不同科目
- **圆角卡片**：24rpx 大圆角，符合儿童审美
- **自定义导航栏**：颜色跟随任务色，沉浸感强
- **进度条动画**：CSS transition 平滑过渡

---

## 🔧 扩展建议

| 功能 | 实现思路 |
|------|---------|
| 云端同步 | 接入微信云开发（CloudBase），存储到云数据库 |
| 家长端查看 | 生成分享码，家长扫码查看子女任务完成情况 |
| 积分奖励 | 完成任务获得星星，兑换虚拟奖励 |
| 提醒推送 | 使用订阅消息（`wx.requestSubscribeMessage`）推送任务提醒 |
| 历史统计 | 按周/月统计完成率，绘制折线图 |
| 真实PDF导出 | 通过云函数调用 puppeteer 或 html2pdf 生成 PDF |
