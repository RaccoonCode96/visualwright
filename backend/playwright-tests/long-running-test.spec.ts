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
        const screenshot = (await page.screenshot({ timeout: 0 })).toString(
          'base64',
        );
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

test('long running interactive test on google.com', async ({ page }) => {
  await page.goto('https://www.google.com');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // 2초 대기

  // 검색창에 텍스트 입력
  await page.fill('textarea[name="q"]', 'Playwright test automation');
  await page.waitForTimeout(1000); // 1초 대기

  // 검색 버튼 클릭 (또는 Enter 키)
  await page.press('textarea[name="q"]', 'Enter');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // 3초 대기

  // 검색 결과에서 특정 링크 클릭 (예: Playwright 공식 문서)
  // 실제 링크 텍스트나 셀렉터는 Google 검색 결과에 따라 다를 수 있습니다.
  // 여기서는 예시로 'Playwright' 텍스트를 포함하는 링크를 클릭합니다.
  await page.locator('a:has-text("Playwright")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000); // 5초 대기

  // 페이지 스크롤
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await page.waitForTimeout(2000); // 2초 대기
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await page.waitForTimeout(2000); // 2초 대기

  // 다른 페이지로 이동 (예: About 페이지)
  // 실제 웹사이트에 따라 이 셀렉터는 다를 수 있습니다.
  // 여기서는 예시로 'About' 텍스트를 포함하는 링크를 찾아 클릭합니다.
  const aboutLink = await page.locator('a:has-text("About")').first();
  if (await aboutLink.isVisible()) {
    await aboutLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // 5초 대기
  } else {
    console.log('About link not found, skipping navigation.');
  }

  // 최종 페이지 제목 확인 (선택 사항)
  await expect(page).not.toHaveTitle('Google');

  await page.waitForTimeout(3000); // 최종 3초 대기
});
