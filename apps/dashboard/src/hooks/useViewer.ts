import { useState, useEffect, useCallback, type RefObject } from 'react';
import type { ExperienceSettings } from '@virtualtour/shared';

interface UseViewerArgs {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  viewerOrigin: string;
}

interface UseViewerReturn {
  sendSettings: (settings: ExperienceSettings) => void;
  isReady: boolean;
}

type ViewerMessageType = 'VIEWER_READY';

interface ViewerMessage {
  type: ViewerMessageType;
}

function isViewerMessage(data: unknown): data is ViewerMessage {
  if (!data || typeof data !== 'object') return false;
  return (data as Record<string, unknown>)['type'] === 'VIEWER_READY';
}

export function useViewer({ iframeRef, viewerOrigin }: UseViewerArgs): UseViewerReturn {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      if (event.origin !== viewerOrigin) return;
      if (isViewerMessage(event.data)) {
        setIsReady(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [viewerOrigin]);

  const sendSettings = useCallback(
    (settings: ExperienceSettings): void => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;

      iframe.contentWindow.postMessage(
        { type: 'UPDATE_SETTINGS', settings },
        viewerOrigin,
      );
    },
    [iframeRef, viewerOrigin],
  );

  return { sendSettings, isReady };
}
