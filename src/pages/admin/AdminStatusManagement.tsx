import { PlatformStatusControl } from '@/components/super-admin/PlatformStatusControl';
import { DowntimeManagement } from '@/components/super-admin/DowntimeManagement';

export default function AdminStatusManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Status Management</h2>
        <p className="text-sm text-muted-foreground">
          Control platform status, banners, and scheduled downtimes
        </p>
      </div>

      <PlatformStatusControl />
      <DowntimeManagement />
    </div>
  );
}
