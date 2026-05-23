import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';
import { useViewer } from '@/hooks/useViewer';
import SplatPreview from '@/components/SplatPreview';
import AnnotationEditor from '@/components/AnnotationEditor';
import CameraEditor from '@/components/CameraEditor';
import AnimTrackEditor from '@/components/AnimTrackEditor';
import PostEffectsPanel from '@/components/PostEffectsPanel';
import AudioUpload from '@/components/AudioUpload';
import PublishPanel from '@/components/PublishPanel';
import type { ExperienceSettings, Annotation, Camera, AnimTrack, PostEffectSettings } from '@virtualtour/shared';
import { VIEWER_BASE_URL } from '@/constants';

type TabId = 'anotacoes' | 'camera' | 'efeitos' | 'audio' | 'publicar';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'anotacoes', label: 'Anotações' },
  { id: 'camera', label: 'Câmera' },
  { id: 'efeitos', label: 'Efeitos' },
  { id: 'audio', label: 'Áudio' },
  { id: 'publicar', label: 'Publicar' },
];

function formatTime(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function TourEditor(): React.ReactElement {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('anotacoes');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { settings, isLoading, saveSettings, forceSave, isDirty, lastSaved } = useSettings(
    tourId ?? '',
  );

  const { sendSettings, isReady } = useViewer({
    iframeRef,
    viewerOrigin: new URL(VIEWER_BASE_URL).origin,
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

  const handleAnimTracksChange = (animTracks: AnimTrack[]): void => {
    if (!settings) return;
    const roomSettings = getFirstRoomSettings();
    if (!roomSettings) return;

    const updatedRooms = settings.rooms.map((r, i) =>
      i === 0 ? { ...r, animTracks } : r,
    );
    saveSettings({ ...settings, rooms: updatedRooms });
  };

  const handlePostEffectsChange = (postEffects: PostEffectSettings): void => {
    if (!settings) return;
    saveSettings({ ...settings, postEffects });
  };

  const handleAudioChange = (url: string | undefined): void => {
    if (!settings) return;
    // ExperienceSettings doesn't have soundUrl; store via spread-omit pattern.
    const base = settings as ExperienceSettings & { soundUrl?: string };
    // Build a new object without soundUrl, then optionally add it back.
    const { soundUrl: _removed, ...rest } = base;
    void _removed;
    const updatedSettings: ExperienceSettings & { soundUrl?: string } =
      url !== undefined ? { ...rest, soundUrl: url } : { ...rest };
    saveSettings(updatedSettings);
  };

  const roomSettings = getFirstRoomSettings();
  const firstRoomCameras: Camera[] = roomSettings
    ? [roomSettings.defaultCamera]
    : [];
  const extSettings = settings as (ExperienceSettings & { soundUrl?: string }) | null;

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
          onClick={() => navigate('/tours')}
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
        <div
          style={{
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
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
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e5e7eb',
              overflowX: 'auto',
            }}
          >
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
                  <AnimTrackEditor
                    animTracks={roomSettings?.animTracks ?? []}
                    onChange={handleAnimTracksChange}
                  />
                )}
                {activeTab === 'audio' && (
                  <div>
                    <PostEffectsPanel
                      postEffects={settings.postEffects}
                      onChange={handlePostEffectsChange}
                    />
                    <div style={{ marginTop: '1.5rem' }}>
                      <AudioUpload
                        soundUrl={extSettings?.soundUrl}
                        onChange={handleAudioChange}
                      />
                    </div>
                  </div>
                )}
                {activeTab === 'publicar' && (
                  <PublishPanel
                    tourId={tourId}
                    isPublished={false}
                    viewerUrl={`${VIEWER_BASE_URL}/tour/${tourId}`}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right panel — preview */}
        <div style={{ flex: 1, background: '#1a1a2e', overflow: 'hidden' }}>
          <SplatPreview tourId={tourId} settings={settings} iframeRef={iframeRef} />
        </div>
      </div>
    </div>
  );
}
