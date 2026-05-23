import React from 'react';
import type { Room } from '@virtualtour/shared';
import { RoomStatus } from '@virtualtour/shared';

interface RoomListProps {
  tourId: string;
  rooms: Room[];
  onRecordRoom: (roomId: string) => void;
}

const STATUS_LABELS: Record<RoomStatus, string> = {
  [RoomStatus.PENDING]: 'Pendente',
  [RoomStatus.UPLOADING]: 'Enviando',
  [RoomStatus.PROCESSING]: 'Processando',
  [RoomStatus.DONE]: 'Concluído',
  [RoomStatus.ERROR]: 'Erro',
};

const STATUS_COLORS: Record<RoomStatus, string> = {
  [RoomStatus.PENDING]: '#6b7280',
  [RoomStatus.UPLOADING]: '#3b82f6',
  [RoomStatus.PROCESSING]: '#f59e0b',
  [RoomStatus.DONE]: '#10b981',
  [RoomStatus.ERROR]: '#ef4444',
};

const RECORDABLE_STATUSES: RoomStatus[] = [RoomStatus.PENDING, RoomStatus.ERROR];

export default function RoomList({
  rooms,
  onRecordRoom,
}: RoomListProps): React.ReactElement {
  if (rooms.length === 0) {
    return (
      <p
        style={{
          color: '#6b7280',
          fontSize: '0.9rem',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        Nenhum cômodo encontrado.
      </p>
    );
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {rooms
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((room) => {
          const canRecord = RECORDABLE_STATUSES.includes(room.status);
          const statusColor = STATUS_COLORS[room.status];
          const statusLabel = STATUS_LABELS[room.status];

          return (
            <li
              key={room.id}
              style={{
                background: '#ffffff',
                borderRadius: '10px',
                padding: '0.875rem 1rem',
                marginBottom: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: 'sans-serif',
              }}
            >
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: '0 0 0.25rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#1f2937',
                  }}
                >
                  {room.name}
                </p>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: `${statusColor}18`,
                    color: statusColor,
                  }}
                >
                  {statusLabel}
                </span>
              </div>

              {canRecord && (
                <button
                  onClick={() => onRecordRoom(room.id)}
                  style={{
                    marginLeft: '0.75rem',
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {room.status === RoomStatus.ERROR ? 'Regravar' : 'Gravar'}
                </button>
              )}
            </li>
          );
        })}
    </ul>
  );
}
