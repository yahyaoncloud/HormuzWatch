import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type ChokepointFocus =
  | 'all'
  | 'hormuz'
  | 'bab-el-mandeb'
  | 'persian-gulf'
  | 'gulf-of-oman';

export const CHOKEPOINT_VIEWPORTS: Record<
  ChokepointFocus,
  { center: [number, number]; zoom: number; label: string }
> = {
  all: { center: [23.5, 52.0], zoom: 6, label: 'Operational Theater (All)' },
  hormuz: { center: [26.2, 56.1], zoom: 8.5, label: 'Strait of Hormuz' },
  'bab-el-mandeb': { center: [12.8, 43.3], zoom: 9, label: 'Bab al-Mandab Strait' },
  'persian-gulf': { center: [26.8, 51.5], zoom: 7, label: 'Persian Gulf Basin' },
  'gulf-of-oman': { center: [24.5, 58.5], zoom: 7.5, label: 'Gulf of Oman' },
};

export interface MapLayersState {
  vessels: boolean;
  aircraft: boolean;
  conflicts: boolean;
  areas: boolean;
  heatmap: boolean;
  metrics: boolean;
}

export interface MapSliceState {
  // Layer Visibility
  layers: MapLayersState;
  toggleLayer: (layer: keyof MapLayersState) => void;
  setLayer: (layer: keyof MapLayersState, visible: boolean) => void;

  // Filters & Timeline
  timeline: '1hr' | '3hr' | '6hr' | '12hr' | '24hr' | 'all';
  setTimeline: (val: '1hr' | '3hr' | '6hr' | '12hr' | '24hr' | 'all') => void;
  severityFilter: string;
  setSeverityFilter: (val: string) => void;
  regionFilter: string;
  setRegionFilter: (val: string) => void;

  // Chokepoint Selection
  chokepointFocus: ChokepointFocus;
  setChokepointFocus: (focus: ChokepointFocus) => void;

  // Viewport & Pan
  recenterTrigger: number;
  triggerRecenter: () => void;
}

export const useMapStateStore = create<MapSliceState>()(
  persist(
    immer((set) => ({
      layers: {
        vessels: true,
        aircraft: true,
        conflicts: true,
        areas: true,
        heatmap: false,
        metrics: false,
      },
      toggleLayer: (layer) =>
        set((state) => {
          state.layers[layer] = !state.layers[layer];
        }),
      setLayer: (layer, visible) =>
        set((state) => {
          state.layers[layer] = visible;
        }),

      timeline: 'all',
      setTimeline: (val) =>
        set((state) => {
          state.timeline = val;
        }),

      severityFilter: 'all',
      setSeverityFilter: (val) =>
        set((state) => {
          state.severityFilter = val;
        }),

      regionFilter: 'all',
      setRegionFilter: (val) =>
        set((state) => {
          state.regionFilter = val;
        }),

      chokepointFocus: 'all',
      setChokepointFocus: (focus) =>
        set((state) => {
          state.chokepointFocus = focus;
          state.recenterTrigger += 1;
        }),

      recenterTrigger: 0,
      triggerRecenter: () =>
        set((state) => {
          state.recenterTrigger += 1;
        }),
    })),
    {
      name: 'hw-map-state-v2',
      partialize: (state) => ({
        layers: state.layers,
        timeline: state.timeline,
        severityFilter: state.severityFilter,
        regionFilter: state.regionFilter,
        chokepointFocus: state.chokepointFocus,
      }),
    }
  )
);
