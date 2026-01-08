import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // 必须引入这个文件，Tailwind 样式才能生效
import './i18n'; // Import i18n config

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