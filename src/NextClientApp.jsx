import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

export default function NextClientApp() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
