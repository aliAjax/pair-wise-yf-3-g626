import { useEffect, useState } from 'react';
import {
  X, MapPin, History, PencilLine, Check, AlertTriangle, CornerUpRight,
} from 'lucide-react';
import { useMemoryStore } from '../store/memoryStore';
import { buildLocationDirectory } from '../utils/locations';
import { formatDate } from '../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface Feedback {
  type: 'success' | 'error';
  text: string;
}

export default function LocationDirectoryModal({ isOpen, onClose }: Props) {
  const { memories, renameRecords, renameLocation } = useMemoryStore();
  const [editingName, setEditingName] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const entries = buildLocationDirectory(memories, renameRecords);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setEditingName(null);
      setFeedback(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const startRename = (currentName: string) => {
    setEditingName(currentName);
    setDraft(currentName);
    setFeedback(null);
  };

  const cancelRename = () => {
    setEditingName(null);
    setDraft('');
  };

  const confirmRename = () => {
    if (!editingName) return;
    const outcome = renameLocation(editingName, draft);
    if (outcome.ok) {
      setFeedback({ type: 'success', text: outcome.message });
      setEditingName(null);
      setDraft('');
    } else {
      // 整批整理已停下，目录未改动，编辑状态保留方便修改
      setFeedback({ type: 'error', text: outcome.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-8 md:p-6 overflow-y-auto">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />
      <div className="relative w-full max-w-2xl bg-paper-50 rounded-3xl shadow-2xl border border-paper-300 animate-slideDown">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-paper-200 rounded-t-3xl bg-paper-50/95 backdrop-blur">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink-800 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-ochre-500" />
              地点目录
            </h2>
            <p className="text-sm text-ink-700/60 mt-0.5 font-hand">
              同一个老地方的几种叫法，在这里收成一个名字
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-700/60 hover:text-ink-800 hover:bg-paper-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 改名规则：独立说明，与目录列表分开 */}
        <div className="mx-6 mt-5 rounded-2xl border border-ochre-200 bg-ochre-100/40 p-4">
          <h3 className="font-hand text-lg text-ochre-600 mb-2">改名规则</h3>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-700/80">
            <li className="flex gap-2">
              <CornerUpRight className="w-4 h-4 mt-0.5 shrink-0 text-ochre-500" />
              给旧称呼取新名字后，它牵着的所有记忆一起使用新称呼；旧名字留在记录里当曾用名，并记下改名日期。
            </li>
            <li className="flex gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-brick-500" />
              新名字如果已经属于别处（别处的现用名或曾用名），这批整理直接停下，目录、筛选数和卡片顺序都照原样。
            </li>
            <li className="flex gap-2">
              <History className="w-4 h-4 mt-0.5 shrink-0 text-moss-600" />
              卡片、图表与筛选只认现用地点；展开卡片可以看到旧称呼和改名日期。
            </li>
          </ul>
        </div>

        {feedback && (
          <div
            className={`mx-6 mt-4 rounded-xl px-4 py-2.5 text-sm flex items-start gap-2 border ${
              feedback.type === 'success'
                ? 'bg-moss-100/70 border-moss-200 text-moss-600'
                : 'bg-brick-400/10 border-brick-400/30 text-brick-600'
            }`}
          >
            {feedback.type === 'error' && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
          {entries.length === 0 ? (
            <div className="text-center py-10 text-ink-700/50 text-sm">
              还没有地点，先封存一段气味吧
            </div>
          ) : (
            entries.map((entry) => {
              const isEditing = editingName === entry.currentName;
              return (
                <div
                  key={entry.currentName}
                  className="rounded-2xl border border-paper-300 bg-paper-100/50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename();
                          if (e.key === 'Escape') cancelRename();
                        }}
                        placeholder="输入新的地点名"
                        className="scent-input flex-1"
                      />
                    ) : (
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif text-lg font-semibold text-ink-800">
                            {entry.currentName}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ochre-100 text-ochre-600 text-[11px] font-medium">
                            {entry.memoryCount} 段记忆
                          </span>
                        </div>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={confirmRename}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-moss-500 hover:bg-moss-600 text-paper-50 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> 确认改名
                        </button>
                        <button
                          onClick={cancelRename}
                          className="px-3 py-1.5 rounded-lg text-xs text-ink-700/70 hover:bg-paper-200 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startRename(entry.currentName)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-ochre-600 hover:bg-ochre-100 transition-colors shrink-0"
                      >
                        <PencilLine className="w-3.5 h-3.5" /> 改个名字
                      </button>
                    )}
                  </div>

                  {entry.formerNames.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-paper-200/80">
                      <div className="flex items-center gap-1.5 text-[11px] text-ink-700/55 mb-1.5">
                        <History className="w-3 h-3" />
                        曾用名（旧称呼保留在记录里）
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[...entry.formerNames].reverse().map((f) => (
                          <span
                            key={f.name}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-paper-200/70 text-ink-700/70 text-xs border border-paper-300"
                            title={`改名于 ${formatDate(f.renamedAt)}`}
                          >
                            <span className="line-through decoration-ink-700/40">{f.name}</span>
                            <span className="text-[10px] text-ink-700/45">
                              {formatDate(f.renamedAt)}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-paper-200 rounded-b-3xl">
          <button type="button" onClick={onClose} className="btn-primary">
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
