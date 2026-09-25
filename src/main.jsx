import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { installCafeEnv } from './lib/cafeEnv';
import { applyInteractionMode, getInteractionMode } from './lib/layout';
import { initTheme } from './lib/theme';
import './styles/globals.css';
import './styles/sale.css';
import './styles/beui.css';

installCafeEnv();
initTheme();
applyInteractionMode(getInteractionMode());
createRoot(document.getElementById('root')).render(
  <HashRouter>
    <App />
  </HashRouter>,
);
