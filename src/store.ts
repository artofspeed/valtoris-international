import { create } from 'zustand';

/**
 * Global UI state. Kept small on purpose — the content is static HTML.
 * Extend here if we add interactive features (search, cart, auth).
 */
type UIState = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
};

export const useUI = create<UIState>((set) => ({
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
}));
