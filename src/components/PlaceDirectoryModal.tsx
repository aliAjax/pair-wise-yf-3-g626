import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Pencil, Check, Tag, MapPin, AlertCircle } from 'lucide-react';
import { usePlaceStore } from '../store/placeStore';
import type { SmellMemory } from '../utils/constants';
import { buildDirectory, type DirectoryEntry } from '../utils/places';
import { formatDay } from '../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  memories: SmellMemory[];
  /** 改名成功后回调，调用方可据此让筛选跟随到新称呼 */
  onRenamed?: (oldName: string, newName: string) => void;
}

export default function PlaceDirectoryModal({ isOpen, onClose, memories, onRenamed }: Props) {
  const places = usePlaceStore((s) => s.places);
  const renameLocation = usePlaceStore((s) => s.renameLocation);

  const [editingName, setEditingName] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 地点目录：显式目录 + 记忆中出现的地点，按记忆条数降序、首次出现先后排列
  const entries = useMemo(() => buildDirectory(memories, places), [memories, places]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setEditingName(null);
      setError(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (editingName) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingName]);

  if (!isOpen) return null;

  const startEdit = (entry: DirectoryEntry) => {
    setEditingName(entry.name);
    setDraft(entry.name);
    setError(null);
  };
  const cancelEdit = () => {
    setEditingName(null);
    setError(null);
  };

  const submitRename = (oldName: string) => {
    const trimmed = draft.trim();
    const result = renameLocation(oldName, trimmed);
    if (result.ok === false) {
      // 新名字属于别处：整批整理停下，输入框与目录都保持原样
      setError(result.error);
      return;
    }
    setEditingName(null);
    setError(null);
    onRenamed?.(oldName, trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-8 md:p-6 overflow-y-auto">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />
      <div
        className="relative w-full max-w-2xl bg-paper-50 rounded-3xl shadow-2xl border border-paper-300 animate-slideDown"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.54 0 0 0 0 0.35 0 0 0 0 0.18 0 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-paper-200 rounded-t-3xl bg-paper-50/95 backdrop-blur">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink-800 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-ochre-500" />
              地点目录
            </h2>
            <p className="text-sm text-ink-700/60 mt-0.5 font-hand">
              给旧称呼取个新名字，牵着的记忆会一起改名，旧名字留作曾用名
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-700/60 hover:text-ink-800 hover:bg-paper-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {entries.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-5xl mb-3 select-none">🗺️</div>
              <p className="font-hand text-lg text-ochre-600">目录还是空的</p>
              <p className="text-sm text-ink-700/60 mt-1">先封存一段气味，它的地点会自动收录到这里</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-brick-500/10 border border-brick-500/30 text-sm text-brick-600 animate-fadeInUp">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {entries.map((entry) => {
                  const isEditing = editingName === entry.name;
                  return (
                    <li
                      key={entry.name}
                      className="rounded-2xl border border-paper-300 bg-paper-100/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') submitRename(entry.name);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              placeholder="输入这个地点的新称呼"
                              className="scent-input"
                            />
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <MapPin className="w-4 h-4 text-ochre-500 shrink-0" />
                              <span className="font-serif text-lg font-semibold text-ink-800 break-all">
                                {entry.name}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-ochre-100 text-ochre-600 text-[11px] font-medium shrink-0">
                                {entry.memoryCount} 段记忆
                              </span>
                            </div>
                          )}

                          {entry.aliases.length > 0 && !isEditing && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-ink-700/40 shrink-0" />
                              {entry.aliases.map((a) => (
                                <span
                                  key={a.name}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-paper-200/80 text-ink-700/70 text-[11px] border border-paper-300"
                                  title={`曾用名，${formatDay(a.renamed_at)} 改名`}
                                >
                                  {a.name}
                                  <span className="text-ink-700/40">{formatDay(a.renamed_at)}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => submitRename(entry.name)}
                                className="p-2 rounded-lg text-moss-600 hover:bg-moss-100 transition-colors"
                                title="确认改名"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-2 rounded-lg text-ink-700/60 hover:bg-paper-200 transition-colors"
                                title="取消"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(entry)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-ochre-600 hover:bg-ochre-100 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" /> 改名
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 text-[11px] text-ink-700/50 leading-relaxed">
                改名只换称呼，不会移动卡片：这个地点下的所有记忆一起使用新名字，记忆顺序和筛选结果保持不变；
                若新名字已经属于别处，这次整理会直接取消。
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
