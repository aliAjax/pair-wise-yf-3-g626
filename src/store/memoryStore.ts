import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SmellMemory, Season, SmellType, Emotion } from '../utils/constants';
import { generateId } from '../utils/helpers';
import { mockMemories } from '../data/mockData';
import { applyRename } from '../utils/locations';
import type { RenameRecords, RenameOutcome } from '../utils/locations';

export interface MemoryInput {
  location: string;
  source_guess: string;
  intensity: number;
  humidity: number;
  season: Season;
  smell_type: SmellType;
  memory_text: string;
  color_association: string;
  emotion: Emotion;
  want_again: boolean;
}

interface MemoryStore {
  memories: SmellMemory[];
  renameRecords: RenameRecords;
  addMemory: (input: MemoryInput) => void;
  updateMemory: (id: string, input: MemoryInput) => void;
  deleteMemory: (id: string) => void;
  initIfEmpty: () => void;
  /** 地点目录改名：成功则一次提交记忆与档案；冲突时不产生任何改动 */
  renameLocation: (oldName: string, newName: string) => RenameOutcome;
}

export const useMemoryStore = create<MemoryStore>()(
  persist(
    (set, get) => ({
      memories: [],
      renameRecords: {},
      addMemory: (input) => {
        const now = new Date().toISOString();
        const newMem: SmellMemory = {
          id: generateId(),
          ...input,
          created_at: now,
          updated_at: now,
        };
        set({ memories: [newMem, ...get().memories] });
      },
      updateMemory: (id, input) => {
        set({
          memories: get().memories.map((m) =>
            m.id === id
              ? { ...m, ...input, updated_at: new Date().toISOString() }
              : m,
          ),
        });
      },
      deleteMemory: (id) => {
        set({ memories: get().memories.filter((m) => m.id !== id) });
      },
      initIfEmpty: () => {
        if (get().memories.length === 0) {
          set({ memories: mockMemories });
        }
      },
      renameLocation: (oldName, newName) => {
        const { memories, renameRecords } = get();
        const outcome = applyRename(memories, renameRecords, oldName, newName);
        // 冲突或校验失败：整批整理停下，目录、筛选数与卡片顺序原样
        if (!outcome.ok) return outcome;
        set({ memories: outcome.memories!, renameRecords: outcome.renameRecords! });
        return outcome;
      },
    }),
    {
      name: 'scent-memory-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
