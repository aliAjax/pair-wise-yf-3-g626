import type { SmellMemory } from './constants';

/** 一条曾用名记录：旧称呼 + 改名日期 */
export interface FormerName {
  name: string;
  renamedAt: string; // ISO 时间
}

/**
 * 地点改名档案。
 * key 为现用地点名，value 是按改名先后排列的曾用名链（最旧在前）。
 * 只持久化改名记录本身，目录的其余部分从记忆数据实时派生。
 */
export type RenameRecords = Record<string, FormerName[]>;

export interface LocationEntry {
  currentName: string;
  formerNames: FormerName[];
  memoryCount: number;
}

export function normalizeLocationName(name: string): string {
  return name.trim();
}

/**
 * 把任意写作地点（可能是现用名，也可能是旧称呼）解析为现用地点名。
 * 曾用名不属于任何「现用地点」，卡片、图表、筛选一律只认解析结果。
 */
export function resolveLocationName(name: string, records: RenameRecords): string {
  if (Object.prototype.hasOwnProperty.call(records, name)) return name;
  for (const [current, formers] of Object.entries(records)) {
    if (formers.some((f) => f.name === name)) return current;
  }
  return name;
}

/** 从记忆与改名档案实时派生地点目录，按记忆数降序、名称排序。 */
export function buildLocationDirectory(
  memories: SmellMemory[],
  records: RenameRecords,
): LocationEntry[] {
  const counts = new Map<string, number>();
  for (const m of memories) {
    const current = resolveLocationName(m.location, records);
    counts.set(current, (counts.get(current) ?? 0) + 1);
  }

  const entries: LocationEntry[] = [];
  for (const [currentName, memoryCount] of counts) {
    entries.push({
      currentName,
      formerNames: records[currentName] ?? [],
      memoryCount,
    });
  }
  entries.sort(
    (a, b) => b.memoryCount - a.memoryCount || a.currentName.localeCompare(b.currentName, 'zh'),
  );
  return entries;
}

export interface RenameOutcome {
  ok: boolean;
  message: string;
  affectedCount?: number;
  memories?: SmellMemory[];
  renameRecords?: RenameRecords;
}

/**
 * 给一个现用地点改名（纯规则，不碰存储）。
 *
 * - 关联记忆一起使用新称呼，旧称呼进入曾用名链并记下改名日期；
 * - 新名字已被「别处」占用（别处的现用名或曾用名）时整批整理停止，
 *   返回 ok:false，调用方不得写入任何改动；
 * - 记忆数组只做逐项替换、不重排，卡片顺序保持原样。
 */
export function applyRename(
  memories: SmellMemory[],
  records: RenameRecords,
  oldName: string,
  newNameInput: string,
  nowIso: string = new Date().toISOString(),
): RenameOutcome {
  const newName = normalizeLocationName(newNameInput);
  if (!newName) {
    return { ok: false, message: '新名字不能为空' };
  }
  if (newName === oldName) {
    return { ok: false, message: '新名字和现用名一样，没有需要整理的' };
  }

  const exists = memories.some(
    (m) => resolveLocationName(m.location, records) === oldName,
  );
  if (!exists) {
    return { ok: false, message: '目录里找不到这个地点' };
  }

  // 别处占用的名字：其他现用地点（含没有改名记录的临时地点）+ 别处的曾用名
  const occupiedElsewhere = new Set<string>();
  for (const m of memories) {
    const current = resolveLocationName(m.location, records);
    if (current !== oldName) occupiedElsewhere.add(current);
  }
  for (const [current, formers] of Object.entries(records)) {
    if (current === oldName) continue;
    for (const f of formers) occupiedElsewhere.add(f.name);
  }
  if (occupiedElsewhere.has(newName)) {
    return {
      ok: false,
      message: `「${newName}」已经属于别处，本次整理已停止，目录与卡片均未改动`,
    };
  }

  const ownFormers = records[oldName] ?? [];
  let nextFormers: FormerName[];
  if (ownFormers.some((f) => f.name === newName)) {
    // 改回自己曾经用过的名字：该旧称呼恢复为现用名，现用名转为曾用名
    nextFormers = [
      ...ownFormers.filter((f) => f.name !== newName),
      { name: oldName, renamedAt: nowIso },
    ];
  } else {
    nextFormers = [...ownFormers, { name: oldName, renamedAt: nowIso }];
  }

  const nextRecords: RenameRecords = { ...records };
  delete nextRecords[oldName];
  nextRecords[newName] = nextFormers;

  // map 逐项替换，数组顺序不变；解析到 oldName 的记忆（含仍写作旧称呼的）一并改名
  let affectedCount = 0;
  const nextMemories = memories.map((m) => {
    if (resolveLocationName(m.location, records) === oldName) {
      affectedCount += 1;
      return { ...m, location: newName };
    }
    return m;
  });

  return {
    ok: true,
    affectedCount,
    message: `已将「${oldName}」改名为「${newName}」，${affectedCount} 段记忆同步使用新称呼`,
    memories: nextMemories,
    renameRecords: nextRecords,
  };
}
