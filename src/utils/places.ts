import type { SmellMemory } from './constants';
import { generateId } from './helpers';

/** 曾用名（旧称呼）及其改名日期 */
export interface PlaceAlias {
  name: string;
  renamed_at: string;
}

/** 地点目录中的一条显式记录 */
export interface Place {
  id: string;
  /** 现用地点名 */
  name: string;
  /** 曾用名，按改名先后排列 */
  aliases: PlaceAlias[];
  created_at: string;
}

/** 目录视图：显式记录与记忆中出现、但尚未收录进目录的隐式地点合并后的结果 */
export interface DirectoryEntry {
  /** 目录中的显式记录；只在记忆里出现、从未改过名的地点为 null */
  place: Place | null;
  name: string;
  aliases: PlaceAlias[];
  memoryCount: number;
}

export type RenameResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * 合并地点目录：以记忆中实际出现的地点为准（按首次出现顺序），
 * 再补上记忆已删尽、但目录里仍留档的地点。
 */
export function buildDirectory(memories: SmellMemory[], places: Place[]): DirectoryEntry[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const m of memories) {
    if (!counts.has(m.location)) {
      counts.set(m.location, 0);
      order.push(m.location);
    }
    counts.set(m.location, (counts.get(m.location) ?? 0) + 1);
  }

  const placeByName = new Map(places.map((p) => [p.name, p]));

  const entries: DirectoryEntry[] = order.map((name) => {
    const place = placeByName.get(name) ?? null;
    return {
      place,
      name,
      aliases: place?.aliases ?? [],
      memoryCount: counts.get(name) ?? 0,
    };
  });

  for (const place of places) {
    if (!counts.has(place.name)) {
      entries.push({ place, name: place.name, aliases: place.aliases, memoryCount: 0 });
    }
  }
  return entries;
}

/**
 * 改名规则（纯校验，不修改任何数据）：
 * 新名字若已经属于别处（别处的现用名或曾用名），整批整理必须停下。
 * 返回 null 表示可以改名，否则返回给用户看的原因。
 */
export function validateRename(
  places: Place[],
  memories: SmellMemory[],
  oldName: string,
  newNameRaw: string,
): string | null {
  const newName = newNameRaw.trim();
  if (!newName) return '请先填写新的地点称呼';
  if (newName === oldName) return '新称呼和现用称呼一样，没有需要整理的内容';

  const otherNames = new Set<string>();
  for (const m of memories) {
    if (m.location !== oldName) otherNames.add(m.location);
  }
  for (const p of places) {
    if (p.name === oldName) continue;
    otherNames.add(p.name);
    for (const a of p.aliases) otherNames.add(a.name);
  }

  if (otherNames.has(newName)) {
    return `「${newName}」已经是别处在用的称呼，本次整理已取消，目录、筛选和卡片都保持原样`;
  }
  return null;
}

/**
 * 目录数据的纯变换：现用名换成新名字，旧称呼带着改名日期留作曾用名。
 * 只在 validateRename 通过后调用。
 */
export function applyRenameToPlaces(
  places: Place[],
  oldName: string,
  newName: string,
  now: string,
): Place[] {
  const existing = places.find((p) => p.name === oldName);
  if (existing) {
    return places.map((p) =>
      p.id === existing.id
        ? {
            ...p,
            name: newName,
            // 若改回某个曾用名，先让它从曾用名里退出，旧现用名再补入
            aliases: [
              ...p.aliases.filter((a) => a.name !== newName),
              { name: oldName, renamed_at: now },
            ],
          }
        : p,
    );
  }

  return [
    ...places,
    {
      id: generateId(),
      name: newName,
      aliases: [{ name: oldName, renamed_at: now }],
      created_at: now,
    },
  ];
}
