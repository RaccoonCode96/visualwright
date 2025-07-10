import { AppProvider } from '@/providers';
import { BrowserRouter, Route, Routes } from 'react-router';
import { DashboardPage } from './dashboard';
import { NotFound } from './not-found';
import { TestPage } from './test';
import { ROUTES } from './routes';

export const AppRouter = () => {
  return (
    <BrowserRouter basename="client">
      <Routes>
        <Route element={<AppProvider />}>
          <Route index element={<DashboardPage />} />
          <Route path={ROUTES.dashboard} element={<DashboardPage />} />
          <Route path={ROUTES.test} element={<TestPage />} />
          <Route path={ROUTES.catchAll} element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
