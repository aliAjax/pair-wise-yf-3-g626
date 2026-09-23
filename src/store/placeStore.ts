import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useMemoryStore } from './memoryStore';
import {
  validateRename,
  applyRenameToPlaces,
  type Place,
  type RenameResult,
} from '../utils/places';

interface PlaceStore {
  /** 地点目录；只显式记录经历过改名（含首次整理）的地点 */
  places: Place[];
  /**
   * 给一个现用地点改新名字：它牵着的所有记忆一起换用新称呼，
   * 旧名字留在目录里当曾用名。新名字若已属于别处，整批整理直接停下，
   * 目录、筛选数和卡片顺序都照原样（不在校验前改动任何状态）。
   */
  renameLocation: (oldName: string, newName: string) => RenameResult;
}

export const usePlaceStore = create<PlaceStore>()(
  persist(
    (set, get) => ({
      places: [],
      renameLocation: (oldName, rawNewName) => {
        const newName = rawNewName.trim();
        const memories = useMemoryStore.getState().memories;
        const places = get().places;

        // 先做全部校验，任何一项不通过都不动数据
        const error = validateRename(places, memories, oldName, newName);
        if (error) return { ok: false, error };

        const now = new Date().toISOString();
        const nextPlaces = applyRenameToPlaces(places, oldName, newName, now);

        // 它牵着的记忆一起使用新称呼（不改记忆本身的 updated_at）
        const nextMemories = memories.map((m) =>
          m.location === oldName ? { ...m, location: newName } : m,
        );

        // 两处数据在同一轮提交，保证“要么整批完成、要么原样不动”
        set({ places: nextPlaces });
        useMemoryStore.setState({ memories: nextMemories });

        return { ok: true };
      },
    }),
    {
      name: 'scent-place-directory',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
