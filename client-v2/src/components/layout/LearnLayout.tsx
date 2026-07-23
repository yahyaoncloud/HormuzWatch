import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { PageContainer } from './PageContainer';

export const LEARN_TOC_ITEMS = [
  { id: 'introduction', title: 'Introduction', level: 1 as const },
  { id: 'what-is', title: 'What is HormuzWatch', level: 2 as const },
  { id: 'architecture', title: 'Architecture', level: 2 as const },
  { id: 'data-sources', title: 'Data Sources', level: 2 as const },
  { id: 'detection', title: 'Detection Pipeline', level: 2 as const },
  { id: 'scoring', title: 'Anomaly Scoring', level: 2 as const },
  { id: 'ml', title: 'Machine Learning', level: 2 as const },
  { id: 'deployment', title: 'Deployment', level: 2 as const },
  { id: 'faq', title: 'FAQ', level: 2 as const },
];

export function LearnLayout() {
  const [activeId, setActiveId] = useState<string>(LEARN_TOC_ITEMS[0]?.id ?? '');
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140; // Offset for sticky navbar & section headers
      let currentId = LEARN_TOC_ITEMS[0]?.id ?? '';

      for (const item of LEARN_TOC_ITEMS) {
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            currentId = item.id;
          }
        }
      }
      setActiveId(currentId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Trigger initial scroll check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);

  const handleNavigate = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
      history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <PageContainer
      showTOC={true}
      tocItems={LEARN_TOC_ITEMS}
      activeTocId={activeId}
      onTocNavigate={handleNavigate}
    >
      <Outlet />
    </PageContainer>
  );
}
