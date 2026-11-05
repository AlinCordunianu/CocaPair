import { lazy, Suspense, useSyncExternalStore } from 'react';

const DesktopFallback = lazy(
  () => import('./components/DesktopFallback/DesktopFallback'),
);
const MobileExperience = lazy(() => import('./MobileExperience'));
// Touch devices, including landscape phones and tablets, keep the scanning flow.
const desktopQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

function subscribe(callback) {
  desktopQuery.addEventListener('change', callback);
  return () => desktopQuery.removeEventListener('change', callback);
}

function isDesktop() {
  return desktopQuery.matches;
}

export default function App() {
  const desktop = useSyncExternalStore(subscribe, isDesktop);
  return (
    <Suspense
      fallback={
        <main className="app-loading" role="status">
          Opening CocaPair…
        </main>
      }
    >
      {desktop ? <DesktopFallback /> : <MobileExperience />}
    </Suspense>
  );
}
