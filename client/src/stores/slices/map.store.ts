import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

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
      }),
    }
  )
);
