import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';
import { useViewer } from '@/hooks/useViewer';
import { VIEWER_ORIGIN } from '@/constants';
import AnnotationEditor from '@/components/AnnotationEditor';
import PostEffectsPanel from '@/components/PostEffectsPanel';
import PublishPanel from '@/components/PublishPanel';
import type {
  ExperienceSettings,
  Annotation,
  Camera,
  PostEffectSettings,
} from '@virtualtour/shared';

type TabId = 'anotacoes' | 'camera' | 'efeitos' | 'publicar';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'anotacoes', label: 'Anotações' },
  { id: 'camera', label: 'Câmera' },
  { id: 'efeitos', label: 'Efeitos' },
  { id: 'publicar', label: 'Publicar' },
];

function formatTime(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const MIN_FOV = 30;
const MAX_FOV = 120;
const DEFAULT_CAMERA: Camera = { position: [0, 1, 5], target: [0, 0, 0], fov: 75 };

function CameraEditor({
  cameras,
  onChange,
}: {
  cameras: Camera[];
  onChange: (cameras: Camera[]) => void;
}): React.ReactElement {
  const camera = cameras[0] ?? DEFAULT_CAMERA;

  const handlePositionChange = (axis: 0 | 1 | 2, value: string): void => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const pos: [number, number, number] = [...camera.position];
    pos[axis] = num;
    const updated: Camera = { ...camera, position: pos };
    onChange([updated, ...cameras.slice(1)]);
  };

  const handleTargetChange = (axis: 0 | 1 | 2, value: string): void => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const target: [number, number, number] = [...camera.target];
    target[axis] = num;
    const updated: Camera = { ...camera, target };
    onChange([updated, ...cameras.slice(1)]);
  };

  const handleFovChange = (value: string): void => {
    const fov = parseFloat(value);
    if (isNaN(fov)) return;
    onChange([{ ...camera, fov }, ...cameras.slice(1)]);
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#6b7280',
    display: 'block',
    marginBottom: '0.25rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.375rem 0.5rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.825rem',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const renderVec3 = (
    label: string,
    values: [number, number, number],
    onVecChange: (axis: 0 | 1 | 2, value: string) => void,
  ): React.ReactElement => (
    <div style={{ marginBottom: '0.875rem' }}>
      <label style={{ ...labelStyle, marginBottom: '0.375rem' }}>{label}</label>
      <div style={{ display: 'flex', gap: '0.375rem' }}>
        {(['X', 'Y', 'Z'] as const).map((axis, index) => (
          <div key={axis} style={{ flex: 1 }}>
            <label style={{ fontSize: '0.65rem', color: '#9ca3af', display: 'block', marginBottom: '0.1rem' }}>
              {axis}
            </label>
            <input
              type="number"
              step="0.1"
              value={values[index] ?? 0}
              onChange={(e) => onVecChange(index as 0 | 1 | 2, e.target.value)}
              style={inputStyle}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#1f2937' }}>
          Câmera Padrão
        </h3>
        <button
          onClick={() => onChange([{ ...DEFAULT_CAMERA }, ...cameras.slice(1)])}
          style={{
            background: 'transparent',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '0.3rem 0.625rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          Redefinir
        </button>
      </div>
      {renderVec3('Posição', camera.position, handlePositionChange)}
      {renderVec3('Alvo', camera.target, handleTargetChange)}
      <div>
        <label style={labelStyle}>Campo de Visão (FOV): {Math.round(camera.fov)}°</label>
        <input
          type="range"
          min={MIN_FOV}
          max={MAX_FOV}
          step="1"
          value={camera.fov}
          onChange={(e) => handleFovChange(e.target.value)}
          style={{ width: '100%', accentColor: '#4f46e5' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.125rem' }}>
          <span>{MIN_FOV}°</span>
          <span>{MAX_FOV}°</span>
        </div>
      </div>
    </div>
  );
}

export default function TourEditor(): React.ReactElement {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('anotacoes');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const { settings, isLoading, saveSettings, forceSave, isDirty, lastSaved } = useSettings(
    tourId ?? '',
  );

  const viewerUrl = tourId ? `/tour/${tourId}?preview=1` : '';

  const { sendSettings, isReady } = useViewer({
    iframeRef,
    viewerOrigin: VIEWER_ORIGIN,
  });

  // Sync settings to viewer on every change
  useEffect(() => {
    if (settings && isReady) {
      sendSettings(settings);
    }
  }, [settings, isReady, sendSettings]);

  // Force save when navigating away
  useEffect(() => {
    return () => {
      void forceSave();
    };
  }, [forceSave]);

  if (!tourId) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        Tour não encontrado.
      </div>
    );
  }

  const getFirstRoomSettings = () => {
    if (!settings || settings.rooms.length === 0) return null;
    return settings.rooms[0] ?? null;
  };

  const handleAnnotationsChange = (annotations: Annotation[]): void => {
    if (!settings) return;
    const roomSettings = getFirstRoomSettings();
    if (!roomSettings) return;

    const updatedRooms = settings.rooms.map((r, i) =>
      i === 0 ? { ...r, annotations } : r,
    );
    saveSettings({ ...settings, rooms: updatedRooms });
  };

  const handleCamerasChange = (cameras: Camera[]): void => {
    if (!settings) return;
    const roomSettings = getFirstRoomSettings();
    if (!roomSettings) return;

    const defaultCamera = cameras[0] ?? roomSettings.defaultCamera;
    const updatedRooms = settings.rooms.map((r, i) =>
      i === 0 ? { ...r, defaultCamera } : r,
    );
    saveSettings({ ...settings, rooms: updatedRooms });
  };

  const handlePostEffectsChange = (postEffects: PostEffectSettings): void => {
    if (!settings) return;
    saveSettings({ ...settings, postEffects });
  };

  const roomSettings = getFirstRoomSettings();
  const firstRoomCameras: Camera[] = roomSettings ? [roomSettings.defaultCamera] : [];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        fontFamily: 'sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <header
        style={{
          background: '#1a1a2e',
          color: '#ffffff',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate(`/tours/${tourId}`)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            fontSize: '1.25rem',
            cursor: 'pointer',
            padding: '0.25rem',
            lineHeight: 1,
          }}
          aria-label="Voltar"
        >
          ←
        </button>
        <span style={{ fontSize: '1rem', fontWeight: 600, flex: 1 }}>
          Editor de Tour
        </span>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
          {isDirty
            ? 'Salvando...'
            : lastSaved
            ? `Salvo às ${formatTime(lastSaved)}`
            : ''}
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          height: 'calc(100vh - 56px)',
        }}
      >
        {/* Left panel */}
        <div
          style={{
            width: '360px',
            flexShrink: 0,
            background: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', overflowX: 'auto' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom:
                    activeTab === tab.id ? '2px solid #4f46e5' : '2px solid transparent',
                  color: activeTab === tab.id ? '#4f46e5' : '#6b7280',
                  padding: '0.75rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {isLoading ? (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Carregando configurações...
              </p>
            ) : !settings ? (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Nenhuma configuração encontrada para este tour.
              </p>
            ) : (
              <>
                {activeTab === 'anotacoes' && (
                  <AnnotationEditor
                    annotations={roomSettings?.annotations ?? []}
                    onChange={handleAnnotationsChange}
                  />
                )}
                {activeTab === 'camera' && (
                  <CameraEditor
                    cameras={firstRoomCameras}
                    onChange={handleCamerasChange}
                  />
                )}
                {activeTab === 'efeitos' && (
                  <PostEffectsPanel
                    postEffects={settings.postEffects}
                    onChange={handlePostEffectsChange}
                  />
                )}
                {activeTab === 'publicar' && (
                  <PublishPanel
                    tourId={tourId}
                    isPublished={false}
                    viewerUrl={`${VIEWER_ORIGIN}/tour/${tourId}`}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right panel — preview iframe */}
        <div style={{ flex: 1, background: '#1a1a2e', overflow: 'hidden', position: 'relative' }}>
          {tourId && (
            <iframe
              ref={iframeRef}
              src={viewerUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
              title="Prévia do tour virtual"
              allow="fullscreen"
            />
          )}
        </div>
      </div>
    </div>
  );
}
