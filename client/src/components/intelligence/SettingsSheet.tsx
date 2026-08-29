import { SettingToggle } from '@/components/ui/SettingToggle';
import { BottomSheet } from '@/components/ui/sheet';
import { updateServerSettings } from '@/lib/api';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  cacheTelemetry: boolean;
  setCacheTelemetry: (val: boolean) => void;
  showHeatmap: boolean;
  setShowHeatmap: (val: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (val: boolean) => void;
}

export function SettingsSheet({
  open,
  onClose,
  cacheTelemetry,
  setCacheTelemetry,
  showHeatmap,
  setShowHeatmap,
  reduceMotion,
  setReduceMotion,
}: SettingsSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Settings"
      description="Platform configuration & display preferences"
    >
      <div className="space-y-1">
        <SettingToggle
          label="Cache Telemetry Findings (5 min TTL)"
          description="Store live telemetry findings and metrics in 5-minute cached snapshots for fast home page loading."
          checked={cacheTelemetry}
          onChange={(val) => {
            setCacheTelemetry(val);
            updateServerSettings({ cache_telemetry_findings: val }).catch(console.error);
          }}
        />
        <SettingToggle
          label="Anomaly heatmap layer"
          description="Overlay a density heatmap of maritime traffic on the map."
          checked={showHeatmap}
          onChange={setShowHeatmap}
        />
        <SettingToggle
          label="Reduce motion"
          description="Minimise animations and transitions across the interface."
          checked={reduceMotion}
          onChange={setReduceMotion}
        />
      </div>
    </BottomSheet>
  );
}
