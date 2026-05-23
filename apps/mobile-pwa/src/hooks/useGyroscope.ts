import { useState, useEffect, useRef, useCallback } from 'react';
import { MAX_ROTATION_SPEED_DEG_PER_SEC, GYRO_COMPLETE_DEGREES } from '@/constants';

type GyroPermission = 'granted' | 'denied' | 'pending';
type RotationSpeed = 'slow' | 'perfect' | 'fast';

const SLOW_THRESHOLD_DEG_PER_SEC = 5;
const SPEED_SAMPLE_INTERVAL_MS = 200;

interface UseGyroscopeReturn {
  rotation: number;
  currentAlpha: number;
  speed: RotationSpeed;
  isComplete: boolean;
  permission: GyroPermission;
  requestPermission: () => Promise<void>;
  reset: () => void;
}

interface DeviceOrientationEventWithPermission extends DeviceOrientationEvent {
  // iOS 13+ static method
}

interface DeviceOrientationEventConstructor {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

export function useGyroscope(): UseGyroscopeReturn {
  const [rotation, setRotation] = useState(0);
  const [currentAlpha, setCurrentAlpha] = useState(0);
  const [speed, setSpeed] = useState<RotationSpeed>('slow');
  const [isComplete, setIsComplete] = useState(false);
  const [permission, setPermission] = useState<GyroPermission>('pending');

  const lastAlphaRef = useRef<number | null>(null);
  const rotationRef = useRef(0);
  const lastEventTimeRef = useRef<number>(0);
  const lastAlphaForSpeedRef = useRef<number | null>(null);
  const speedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calculateDelta = (previous: number, current: number): number => {
    let delta = current - previous;

    // Handle wrap-around at 0/360 boundary
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }

    // We want positive rotation (going in one direction)
    return Math.abs(delta);
  };

  const handleOrientation = useCallback(
    (event: DeviceOrientationEventWithPermission): void => {
      const alpha = event.alpha;
      if (alpha === null) return;

      const now = Date.now();
      setCurrentAlpha(alpha);

      if (lastAlphaRef.current !== null) {
        const delta = calculateDelta(lastAlphaRef.current, alpha);
        const newRotation = Math.min(rotationRef.current + delta, GYRO_COMPLETE_DEGREES);
        rotationRef.current = newRotation;
        setRotation(newRotation);

        if (newRotation >= GYRO_COMPLETE_DEGREES) {
          setIsComplete(true);
        }
      }

      lastAlphaRef.current = alpha;
      lastEventTimeRef.current = now;
    },
    [],
  );

  const startSpeedTracking = useCallback((): void => {
    if (speedIntervalRef.current) {
      clearInterval(speedIntervalRef.current);
    }

    speedIntervalRef.current = setInterval(() => {
      const alpha = lastAlphaRef.current;
      if (alpha === null) {
        setSpeed('slow');
        return;
      }

      if (lastAlphaForSpeedRef.current !== null) {
        const delta = calculateDelta(lastAlphaForSpeedRef.current, alpha);
        const degsPerSec = (delta / SPEED_SAMPLE_INTERVAL_MS) * 1000;

        if (degsPerSec < SLOW_THRESHOLD_DEG_PER_SEC) {
          setSpeed('slow');
        } else if (degsPerSec <= MAX_ROTATION_SPEED_DEG_PER_SEC) {
          setSpeed('perfect');
        } else {
          setSpeed('fast');
        }
      }

      lastAlphaForSpeedRef.current = alpha;
    }, SPEED_SAMPLE_INTERVAL_MS);
  }, []);

  const stopSpeedTracking = useCallback((): void => {
    if (speedIntervalRef.current) {
      clearInterval(speedIntervalRef.current);
      speedIntervalRef.current = null;
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<void> => {
    const DeviceOrientationEventCtor =
      DeviceOrientationEvent as unknown as DeviceOrientationEventConstructor;

    if (typeof DeviceOrientationEventCtor.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEventCtor.requestPermission();
        if (result === 'granted') {
          setPermission('granted');
        } else {
          setPermission('denied');
        }
      } catch {
        setPermission('denied');
      }
    } else {
      // Non-iOS: permission not required
      setPermission('granted');
    }
  }, []);

  const reset = useCallback((): void => {
    rotationRef.current = 0;
    lastAlphaRef.current = null;
    lastAlphaForSpeedRef.current = null;
    setRotation(0);
    setCurrentAlpha(0);
    setSpeed('slow');
    setIsComplete(false);
  }, []);

  useEffect(() => {
    if (permission !== 'granted') return;

    window.addEventListener('deviceorientation', handleOrientation as EventListener);
    startSpeedTracking();

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation as EventListener);
      stopSpeedTracking();
    };
  }, [permission, handleOrientation, startSpeedTracking, stopSpeedTracking]);

  // Auto-detect permission on non-iOS
  useEffect(() => {
    const DeviceOrientationEventCtor =
      DeviceOrientationEvent as unknown as DeviceOrientationEventConstructor;

    if (typeof DeviceOrientationEventCtor.requestPermission !== 'function') {
      setPermission('granted');
    }
  }, []);

  return {
    rotation,
    currentAlpha,
    speed,
    isComplete,
    permission,
    requestPermission,
    reset,
  };
}
