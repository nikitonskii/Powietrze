import { useEffect, useRef, type ReactNode } from 'react';
import { useActivePlace } from '../place';
import { useSettings } from '../settings';
import {
  buildWidgetSnapshot,
  widgetSnapshotIdentity,
  type WidgetSync,
} from '../../core/widget';

// Publishes a baked WidgetSnapshot to the App-Group widget whenever the
// active place's reading (or the scale/precision it's drawn with) produces a
// new identity. Mirrors NotificationsProvider's "derive from settings, sync
// to a seam" shape.
export function WidgetSyncProvider({
  sync,
  children,
}: {
  sync: WidgetSync;
  children: ReactNode;
}) {
  const { status, reading, detail } = useActivePlace();
  const { settings } = useSettings();
  const lastId = useRef<string | null>(null);
  useEffect(() => {
    if (status !== 'ready' || !reading) return;
    const snap = buildWidgetSnapshot(
      reading,
      detail,
      settings.scale,
      settings.precision,
    );
    const id = widgetSnapshotIdentity(snap);
    if (id === lastId.current) return;
    lastId.current = id;
    sync.publish(snap);
  }, [status, reading, detail, settings.scale, settings.precision, sync]);
  return <>{children}</>;
}
