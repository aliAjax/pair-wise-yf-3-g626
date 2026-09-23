import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import FilterPanel from '../components/FilterPanel';
import VisualizationPanel from '../components/VisualizationPanel';
import MemoryCard from '../components/MemoryCard';
import MemoryModal from '../components/MemoryModal';
import LocationDirectoryModal from '../components/LocationDirectoryModal';
import { useMemoryStore } from '../store/memoryStore';
import type { Filters } from '../utils/helpers';
import { filterMemories } from '../utils/helpers';
import type { SmellMemory } from '../utils/constants';
import type { MemoryInput } from '../store/memoryStore';
import { resolveLocationName, buildLocationDirectory } from '../utils/locations';
import { BookOpenCheck, MapPinned } from 'lucide-react';

const defaultFilters: Filters = {
  smellType: '',
  season: '',
  emotion: '',
  location: '',
};

export default function Home() {
  const {
    memories, renameRecords, initIfEmpty, addMemory, updateMemory, deleteMemory,
  } = useMemoryStore();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [editing, setEditing] = useState<SmellMemory | null>(null);

  useEffect(() => {
    initIfEmpty();
  }, [initIfEmpty]);

  // 卡片、图表、筛选统一只认现用地点：把记忆上的地点解析为现用名（数组顺序不变）
  const resolvedMemories = useMemo<SmellMemory[]>(
    () => memories.map((m) => ({
      ...m,
      location: resolveLocationName(m.location, renameRecords),
    })),
    [memories, renameRecords],
  );

  const directory = useMemo(
    () => buildLocationDirectory(memories, renameRecords),
    [memories, renameRecords],
  );
  const locationOptions = useMemo(() => directory.map((d) => d.currentName), [directory]);
  const formerNameMap = useMemo(() => {
    const map = new Map(directory.map((d) => [d.currentName, d.formerNames]));
    return map;
  }, [directory]);

  const filteredMemories = useMemo(
    () => filterMemories(resolvedMemories, filters),
    [resolvedMemories, filters],
  );

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };
  const resetFilters = () => setFilters(defaultFilters);

  const openAddModal = () => { setEditing(null); setModalOpen(true); };
  const openEditModal = (m: SmellMemory) => { setEditing(m); setModalOpen(true); };

  const handleSubmit = (data: MemoryInput) => {
    if (editing) {
      updateMemory(editing.id, data);
    } else {
      addMemory(data);
    }
  };

  const handleDelete = (id: string) => {
    const target = memories.find((m) => m.id === id);
    const locationName = target
      ? resolveLocationName(target.location, renameRecords)
      : '这段记忆';
    const msg = `确认删除「${locationName}」吗？`;
    if (window.confirm(msg)) {
      deleteMemory(id);
      if (expandedId === id) setExpandedId(null);
    }
  };

  const scrollToCard = (id: string) => {
    setExpandedId(id);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-memory-id="${id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const hasActiveFilter = !!(filters.smellType || filters.season || filters.emotion || filters.location);

  return (
    <div className="min-h-screen">
      <Header onAdd={openAddModal} memoryCount={memories.length} />

      <main className="container max-w-6xl pb-20">
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onReset={resetFilters}
          resultCount={filteredMemories.length}
          locations={locationOptions}
        />

        <VisualizationPanel memories={filteredMemories} onSelect={scrollToCard} />

        <section className="mt-2">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="font-hand text-2xl text-ochre-600 flex items-center gap-2">
              <BookOpenCheck className="w-5 h-5" />
              气味档案
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDirectoryOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-paper-50 hover:bg-paper-100 text-ochre-600 border border-paper-300 hover:border-ochre-300 shadow-sm hover:-translate-y-0.5 transition-all duration-200"
              >
                <MapPinned className="w-4 h-4" />
                地点目录
                <span className="text-[11px] text-ink-700/45">{locationOptions.length} 处</span>
              </button>
              <span className="text-xs text-ink-700/50">
                点击卡片展开完整回忆
              </span>
            </div>
          </div>

          {filteredMemories.length === 0 ? (
            <div className="bg-paper-50/70 backdrop-blur rounded-3xl border-2 border-dashed border-paper-400 py-20 text-center">
              <div className="text-6xl mb-4 select-none">🍂</div>
              <h3 className="font-serif text-2xl text-ink-800 mb-2">
                {hasActiveFilter
                  ? '没有匹配的气味记忆'
                  : '还没有封存任何气味'}
              </h3>
              <p className="text-ink-700/60 max-w-md mx-auto mb-6">
                {hasActiveFilter
                  ? '换一组筛选条件试试？或者先封存一段新的气味'
                  : '空气中一定有让你难忘的味道——无论是衣柜里的樟木香，还是雨后操场的青草气'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={openAddModal} className="btn-primary">
                  封存第一段气味
                </button>
                {hasActiveFilter && (
                  <button onClick={resetFilters} className="btn-secondary">
                    清除筛选条件
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="masonry-grid">
              {filteredMemories.map((m, idx) => (
                <div key={m.id} data-memory-id={m.id}>
                  <MemoryCard
                    memory={m}
                    index={idx}
                    isExpanded={expandedId === m.id}
                    formerNames={formerNameMap.get(m.location) ?? []}
                    onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
                    onEdit={() => openEditModal(m)}
                    onDelete={() => handleDelete(m.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="pb-10 pt-4 text-center text-xs text-ink-700/40 font-hand text-lg">
        <p>愿每一缕气味，都是打开旧时光的钥匙 · Scent Archive</p>
      </footer>

      <MemoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        editingData={editing}
      />

      <LocationDirectoryModal
        isOpen={directoryOpen}
        onClose={() => setDirectoryOpen(false)}
      />
    </div>
  );
}
