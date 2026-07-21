import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import antdTheme from './theme/antd';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyleProvider layer>
      <ConfigProvider theme={antdTheme}>
        <AntdApp>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <App />
          </BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </StyleProvider>
  </StrictMode>,
);
