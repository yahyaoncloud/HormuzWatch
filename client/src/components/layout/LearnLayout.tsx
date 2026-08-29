import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { PageContainer } from './PageContainer';
import type { TOCItem } from './FloatingTOC';

// Route-specific TOC fallback configurations
export const ROUTE_TOC_REGISTRY: Record<string, TOCItem[]> = {
  '/learn': [
    { id: 'introduction', title: 'Introduction', level: 1 },
    { id: 'what-is', title: 'What is HormuzWatch', level: 2 },
    { id: 'architecture', title: 'Architecture', level: 2 },
    { id: 'data-sources', title: 'Data Sources', level: 2 },
    { id: 'detection', title: 'Detection Pipeline', level: 2 },
    { id: 'scoring', title: 'Anomaly Scoring', level: 2 },
    { id: 'ml', title: 'Machine Learning', level: 2 },
    { id: 'deployment', title: 'Deployment', level: 2 },
    { id: 'faq', title: 'FAQ', level: 2 },
  ],
  '/learn/satellite': [
    { id: 'overview', title: 'Satellite Overview', level: 1 },
    { id: 'sensors', title: 'Constellations & Sensors', level: 2 },
    { id: 'viirs', title: 'Thermal & Fire (VIIRS)', level: 2 },
    { id: 'sentinel', title: 'Multispectral (Sentinel-2)', level: 2 },
    { id: 'sar', title: 'Radar Imagery (SAR)', level: 2 },
    { id: 'pipeline', title: 'Imagery Pipeline', level: 2 },
  ],
  '/learn/ais': [
    { id: 'overview', title: 'AIS Protocol Overview', level: 1 },
    { id: 'message-types', title: 'NMEA Message Types', level: 2 },
    { id: 'chokepoint-tracking', title: 'Chokepoint Ingestion', level: 2 },
    { id: 'spoofing', title: 'Dark Ships & Spoofing', level: 2 },
    { id: 'kinematics', title: 'Kinematic Features', level: 2 },
  ],
  '/learn/adsb': [
    { id: 'overview', title: 'ADS-B Aerial Tracking', level: 1 },
    { id: 'opensky', title: 'OpenSky Network Feed', level: 2 },
    { id: 'corridor', title: 'Gulf Air Corridors', level: 2 },
    { id: 'anomalies', title: 'Aviation Anomaly Detection', level: 2 },
  ],
  '/learn/architecture': [
    { id: 'overview', title: 'System Architecture', level: 1 },
    { id: 'cloud-infrastructure', title: 'Azure Cloud Topology', level: 2 },
    { id: 'go-backend', title: 'Go Backend & gRPC', level: 2 },
    { id: 'ml-service', title: 'Python ML Inference', level: 2 },
    { id: 'storage', title: 'Database & Blob Storage', level: 2 },
  ],
};

export function LearnLayout() {
  const location = useLocation();
  const [tocItems, setTocItems] = useState<TOCItem[]>(
    () => ROUTE_TOC_REGISTRY[location.pathname] || ROUTE_TOC_REGISTRY['/learn'] || []
  );
  const [activeId, setActiveId] = useState<string>('');

  // Dynamically update TOC items from document headings or registry
  useEffect(() => {
    const timer = setTimeout(() => {
      // Find all heading elements with IDs
      const elements = Array.from(
        document.querySelectorAll('main section[id], main h2[id], main h3[id]')
      );

      if (elements.length > 0) {
        const dynamicItems: TOCItem[] = elements.map((el) => {
          const title =
            el.getAttribute('data-title') ||
            el.querySelector('h2, h3, h4')?.textContent ||
            el.textContent ||
            el.id;
          const isH3 = el.tagName === 'H3' || el.classList.contains('toc-level-2');
          return {
            id: el.id,
            title: title.trim().slice(0, 40),
            level: (isH3 ? 2 : 1) as 1 | 2,
          };
        });
        setTocItems(dynamicItems);
        if (dynamicItems[0]?.id) setActiveId(dynamicItems[0].id);
      } else {
        const fallback = ROUTE_TOC_REGISTRY[location.pathname] || ROUTE_TOC_REGISTRY['/learn'] || [];
        setTocItems(fallback);
        if (fallback[0]?.id) setActiveId(fallback[0].id);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Scroll listener to track active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;
      let currentId = tocItems[0]?.id ?? '';

      for (const item of tocItems) {
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            currentId = item.id;
          }
        }
      }
      if (currentId) setActiveId(currentId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [tocItems]);

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
      showTOC={tocItems.length > 0}
      tocItems={tocItems}
      activeTocId={activeId}
      onTocNavigate={handleNavigate}
    >
      <Outlet />
    </PageContainer>
  );
}
