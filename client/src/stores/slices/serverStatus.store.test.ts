import { beforeEach, describe, expect, it } from 'vitest';
import { useServerStatusStore } from './serverStatus.store';

describe('useServerStatusStore', () => {
  beforeEach(() => {
    useServerStatusStore.setState({
      serverState: 'online',
      isOnline: true,
      isStreaming: true,
      signalQuality: 'buffered',
      playbackDelaySec: 90,
      activeVesselCount: 0,
      activeAircraftCount: 0,
    });
  });

  it('updates track counts accurately', () => {
    useServerStatusStore.getState().setTrackCounts(42, 18);
    const state = useServerStatusStore.getState();
    expect(state.activeVesselCount).toBe(42);
    expect(state.activeAircraftCount).toBe(18);
  });

  it('updates playback delay', () => {
    useServerStatusStore.getState().setPlaybackDelay(120);
    expect(useServerStatusStore.getState().playbackDelaySec).toBe(120);
  });

  it('sets wsStatus and evaluates connection state transitions', () => {
    useServerStatusStore.getState().setWsStatus('connected');
    expect(useServerStatusStore.getState().isStreaming).toBe(true);

    // If no recent heartbeat (> 30s), disconnected marks offline and stops streaming
    useServerStatusStore.setState({ lastHeartbeat: Date.now() - 35000 });
    useServerStatusStore.getState().setWsStatus('disconnected');
    expect(useServerStatusStore.getState().isStreaming).toBe(false);
    expect(useServerStatusStore.getState().serverState).toBe('offline');
  });
});
