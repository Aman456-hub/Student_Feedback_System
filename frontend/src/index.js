import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css'; // Imports the main stylesheet
import App from './App.tsx'; // Imports the main App component

// This finds the 'root' div in your public/index.html
const root = ReactDOM.createRoot(document.getElementById('root'));

// This tells React to render your <App /> component inside that div
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);