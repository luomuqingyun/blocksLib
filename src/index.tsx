/**
 * ============================================================
 * React 应用入口点 (React Application Entry Point)
 * ============================================================
 * 
 * 这是 Vite 构建系统的入口文件，负责:
 * 1. 挂载 React 应用到 DOM
 * 2. 引入全局样式 (Tailwind CSS)
 * 3. 初始化 i18n 国际化
 * 
 * @file src/index.tsx
 * @module EmbedBlocks/Frontend/Entry
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Tailwind CSS 样式，必须引入
import './i18n'; // 国际化配置初始化
import { InputLogger } from './services/InputLoggerService';

// [DEBUG] 初始化全过程交互诊断记录器
InputLogger.init();
(window as any).InputLogger = InputLogger;


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);