import {
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";

/**
 * Custom hook for enhanced navigation in React Router v7
 * Provides convenient methods for navigation patterns commonly used in PHASE 2
 */
export const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();

  return {
    // Navigate to a route
    goTo: (path: string, state?: any) => navigate(path, { state }),

    // Navigate back
    goBack: () => navigate(-1),

    // Navigate forward
    goForward: () => navigate(1),

    // Refresh current page
    refresh: () => navigate(location.pathname, { replace: true }),

    // Get current pathname
    pathname: location.pathname,

    // Get current location state
    state: location.state,

    // Get route params
    params,

    // Get query parameters as object
    query: (() => {
      const query: Record<string, string> = {};
      searchParams.forEach((value, key) => (query[key] = value));
      return query;
    })(),

    // Check if on specific route
    isRoute: (path: string) => location.pathname === path,

    // Check if route starts with prefix
    isRoutePrefix: (prefix: string) => location.pathname.startsWith(prefix),
  };
};

export default useNavigation;
