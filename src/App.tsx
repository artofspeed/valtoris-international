import { Routes, Route } from 'react-router-dom';
import { routes, routeBySlug } from './pages';
import { StaticPage } from './components/StaticPage';

/**
 * Central URL → component map. Folder-based routing is intentionally NOT
 * used: the full route table lives here in code where it's easy to find
 * and easy for an AI agent to reason about.
 */
export default function App() {
  const notFound = routeBySlug['notFound'];
  return (
    <Routes>
      {routes.map((r) => (
        <Route
          key={r.slug}
          path={r.route}
          element={<StaticPage page={r.page} />}
        />
      ))}
      <Route
        path="*"
        element={
          notFound ? <StaticPage page={notFound.page} /> : <div>Not found</div>
        }
      />
    </Routes>
  );
}
