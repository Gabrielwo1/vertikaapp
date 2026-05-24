import { create } from 'zustand';
import type { Tour, Room } from '@virtualtour/shared';

interface TourState {
  tours: Tour[];
  currentTour: Tour | null;
  currentRoom: Room | null;
  uploadProgress: Record<string, number>;
  isOffline: boolean;
}

interface TourActions {
  setTours: (tours: Tour[]) => void;
  addTour: (tour: Tour) => void;
  updateTour: (tour: Tour) => void;
  removeTour: (tourId: string) => void;
  setCurrentTour: (tour: Tour | null) => void;
  setCurrentRoom: (room: Room | null) => void;
  setUploadProgress: (roomId: string, progress: number) => void;
  setOffline: (offline: boolean) => void;
}

type TourStore = TourState & TourActions;

export const useTourStore = create<TourStore>((set) => ({
  tours: [],
  currentTour: null,
  currentRoom: null,
  uploadProgress: {},
  isOffline: false,

  setTours: (tours) => set({ tours }),

  addTour: (tour) =>
    set((state) => ({ tours: [...state.tours, tour] })),

  updateTour: (tour) =>
    set((state) => ({
      tours: state.tours.map((t) => (t.id === tour.id ? tour : t)),
      currentTour: state.currentTour?.id === tour.id ? tour : state.currentTour,
    })),

  removeTour: (tourId) =>
    set((state) => ({
      tours: state.tours.filter((t) => t.id !== tourId),
      currentTour: state.currentTour?.id === tourId ? null : state.currentTour,
    })),

  setCurrentTour: (tour) => set({ currentTour: tour }),

  setCurrentRoom: (room) => set({ currentRoom: room }),

  setUploadProgress: (roomId, progress) =>
    set((state) => ({
      uploadProgress: { ...state.uploadProgress, [roomId]: progress },
    })),

  setOffline: (offline) => set({ isOffline: offline }),
}));
