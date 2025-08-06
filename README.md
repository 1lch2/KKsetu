# 涩图提取工具 - React 版本

这是一个将原始 HTML 页面转换为 React 组件架构的项目，使用 Webpack 作为构建工具。

## 项目结构

```
kksetu/
├── public/
│   └── index.html          # HTML模板
├── src/
│   ├── components/         # React组件
│   │   ├── Header.jsx      # 页面头部组件
│   │   ├── MainContent.jsx # 主要内容容器组件
│   │   ├── UploadSection.jsx # 上传部分组件
│   │   └── ImageContainer.jsx # 图片显示组件
│   ├── styles/            # CSS样式文件
│   │   ├── global.css     # 全局样式
│   │   ├── Header.css     # 头部样式
│   │   ├── MainContent.css # 主要内容样式
│   │   ├── UploadSection.css # 上传部分样式
│   │   └── ImageContainer.css # 图片容器样式
│   ├── App.jsx            # 主应用组件
│   └── index.js           # 应用入口文件
├── dist/                  # 构建输出目录
├── webpack.config.js      # 开发环境Webpack配置
├── webpack.prod.js        # 生产环境Webpack配置
├── .babelrc              # Babel配置
├── package.json          # 项目依赖和脚本
└── index-backup.html     # 原始HTML文件备份
```

## 功能特性

- ✅ 响应式设计
- ✅ 组件化架构
- ✅ 支持多文件上传
- ✅ 图片预览功能
- ✅ 现代化构建工具链
- ✅ 热重载开发环境

## 安装和运行

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm start
# 或
npm run dev
```

服务器将在 http://localhost:3000 启动

### 生产构建

```bash
npm run build
```

构建文件将输出到 `dist/` 目录

## 技术栈

- **React 19** - 用户界面库
- **Webpack 5** - 模块打包工具
- **Babel** - JavaScript 编译器
- **CSS3** - 样式表
- **ES6+** - 现代 JavaScript 语法

## 组件说明

### Header.jsx

页面头部组件，显示标题和描述。

### UploadSection.jsx

文件上传组件，包含使用说明、文件选择器和警告信息。

### ImageContainer.jsx

图片显示容器，支持网格布局显示多张图片，包含占位符。

### MainContent.jsx

主要内容区域的容器组件，使用 CSS Grid 布局。

## 样式组织

样式文件按组件分离，每个组件都有对应的 CSS 文件：

- 使用 CSS 变量统一主题色彩
- 响应式设计支持移动端
- 模块化样式避免冲突

## 开发说明

1. 所有 React 组件使用函数式组件和 Hooks
2. 样式采用 CSS 模块化组织
3. 支持 ES6+语法和 JSX
4. 使用 Webpack 热重载提升开发体验

## 浏览器支持

支持所有现代浏览器：

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+
