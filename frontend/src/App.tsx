import { useState, useEffect } from 'react';
import './App.css';
import PlaywrightTestRunner from './PlaywrightTestRunner'; // PlaywrightTestRunner 임포트

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:3000')
      .then((res) => res.text())
      .then((data) => setMessage(data));
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, padding: '20px' }}>
        <h1>Visual Playwright</h1>
        <p>{message}</p>
      </div>
      <div style={{ flex: 1, display: 'flex' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <PlaywrightTestRunner />
        </div>
      </div>
    </div>
  );
}

export default App;
