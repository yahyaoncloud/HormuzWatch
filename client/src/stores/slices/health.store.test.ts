import { beforeEach, describe, expect, it } from 'vitest';
import { useHealthStore } from './health.store';

describe('useHealthStore state slice', () => {
  beforeEach(() => {
    useHealthStore.setState({
      systemHealth: null,
      wsStatus: 'connecting',
    });
  });

  it('initializes with default logs and connecting status', () => {
    const state = useHealthStore.getState();
    expect(state.wsStatus).toBe('connecting');
    expect(state.latestLogs.api?.category).toBe('api');
    expect(state.latestLogs.ws?.status).toBe('ok');
  });

  it('updates wsStatus correctly', () => {
    useHealthStore.getState().setWsStatus('connected');
    expect(useHealthStore.getState().wsStatus).toBe('connected');

    useHealthStore.getState().setWsStatus('disconnected');
    expect(useHealthStore.getState().wsStatus).toBe('disconnected');
  });

  it('updates individual metric log entries', () => {
    const newLog = {
      time: '12:00:00',
      category: 'ais' as const,
      message: 'AIS STREAM: Ingesting 45 vessels',
      details: 'Active bounding box',
      status: 'ok' as const,
    };

    useHealthStore.getState().setMetricLog('ais', newLog);
    expect(useHealthStore.getState().latestLogs.ais).toEqual(newLog);
  });
});
