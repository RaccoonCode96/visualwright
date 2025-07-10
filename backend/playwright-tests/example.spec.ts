import { test, expect } from '@playwright/test';
import { io } from 'socket.io-client';

const websocketUrl = 'http://localhost:3000'; // Backend WebSocket URL

test.beforeEach(async ({ page }) => {
  const socket = io(websocketUrl);
  (page as any)._socket = socket; // Store socket on page object for later use

  let screenshotInterval: NodeJS.Timeout | null = null;

  socket.on('connect', () => {
    console.log('Test connected to WebSocket server');
    screenshotInterval = setInterval(async () => {
      try {
        const screenshot = (await page.screenshot({ timeout: 0 })).toString('base64');
        socket.emit('screenshotFrame', { image: screenshot });
      } catch (error) {
        console.error('Error taking screenshot in test:', error);
        if (screenshotInterval) {
          clearInterval(screenshotInterval);
        }
      }
    }, 100); // 100ms (10 FPS)
  });

  socket.on('disconnect', () => {
    console.log('Test disconnected from WebSocket server');
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
    }
  });

  socket.on('connect_error', (err) => {
    console.error('Test WebSocket connection error:', err);
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
    }
  });

  (page as any)._screenshotInterval = screenshotInterval; // Store interval ID
});

test.afterEach(async ({ page }) => {
  if ((page as any)._screenshotInterval) {
    clearInterval((page as any)._screenshotInterval);
  }
  if ((page as any)._socket) {
    (page as any)._socket.disconnect();
  }
});

test('example.com title should be "Example Domain"', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle('Example Domain');
});
