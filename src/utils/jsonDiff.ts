/**
 * JSON 差异计算工具
 * 用于计算两个 JSON 对象之间的差异
 */

export enum DiffType {
  ADDED = 'added',
  DELETED = 'deleted',
  MODIFIED = 'modified',
  UNCHANGED = 'unchanged',
}

export interface DiffResult {
  path: string;
  type: DiffType;
  leftValue?: any;
  rightValue?: any;
}

export interface DiffStats {
  added: number;
  deleted: number;
  modified: number;
  unchanged: number;
}

export interface DiffOptions {
  ignoreKeyOrder?: boolean;
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
  ignoreType?: boolean;
  ignoreKeys?: string[];
}

/**
 * 深度比较两个 JSON 对象并生成差异列表
 */
export function calculateJsonDiff(
  left: any,
  right: any,
  options: DiffOptions = {},
  basePath: string = '$'
): DiffResult[] {
  const diffs: DiffResult[] = [];

  // 处理 null 和 undefined
  if (left === null || left === undefined) {
    if (right === null || right === undefined) {
      diffs.push({ path: basePath, type: DiffType.UNCHANGED, leftValue: left, rightValue: right });
    } else {
      diffs.push({ path: basePath, type: DiffType.ADDED, rightValue: right });
    }
    return diffs;
  }

  if (right === null || right === undefined) {
    diffs.push({ path: basePath, type: DiffType.DELETED, leftValue: left });
    return diffs;
  }

  // 获取类型
  const leftType = getType(left);
  const rightType = getType(right);

  // 类型不同
  if (leftType !== rightType) {
    if (options.ignoreType && areValuesEqual(left, right, options)) {
      diffs.push({ path: basePath, type: DiffType.UNCHANGED, leftValue: left, rightValue: right });
    } else {
      diffs.push({ path: basePath, type: DiffType.MODIFIED, leftValue: left, rightValue: right });
    }
    return diffs;
  }

  // 基本类型比较
  if (leftType !== 'object' && leftType !== 'array') {
    if (areValuesEqual(left, right, options)) {
      diffs.push({ path: basePath, type: DiffType.UNCHANGED, leftValue: left, rightValue: right });
    } else {
      diffs.push({ path: basePath, type: DiffType.MODIFIED, leftValue: left, rightValue: right });
    }
    return diffs;
  }

  // 数组比较
  if (leftType === 'array') {
    const maxLength = Math.max(left.length, right.length);
    for (let i = 0; i < maxLength; i++) {
      const itemPath = `${basePath}[${i}]`;
      if (i >= left.length) {
        diffs.push({ path: itemPath, type: DiffType.ADDED, rightValue: right[i] });
      } else if (i >= right.length) {
        diffs.push({ path: itemPath, type: DiffType.DELETED, leftValue: left[i] });
      } else {
        diffs.push(...calculateJsonDiff(left[i], right[i], options, itemPath));
      }
    }
    return diffs;
  }

  // 对象比较
  const leftKeys = Object.keys(left).filter(key => !options.ignoreKeys?.includes(key));
  const rightKeys = Object.keys(right).filter(key => !options.ignoreKeys?.includes(key));
  const allKeys = new Set([...leftKeys, ...rightKeys]);

  allKeys.forEach(key => {
    const keyPath = `${basePath}.${key}`;
    
    if (!(key in left)) {
      diffs.push({ path: keyPath, type: DiffType.ADDED, rightValue: right[key] });
    } else if (!(key in right)) {
      diffs.push({ path: keyPath, type: DiffType.DELETED, leftValue: left[key] });
    } else {
      diffs.push(...calculateJsonDiff(left[key], right[key], options, keyPath));
    }
  });

  return diffs;
}

/**
 * 获取值的类型
 */
function getType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * 比较两个值是否相等（考虑选项）
 */
function areValuesEqual(left: any, right: any, options: DiffOptions): boolean {
  if (left === right) return true;

  // 忽略类型差异
  if (options.ignoreType) {
    const leftStr = String(left);
    const rightStr = String(right);
    
    if (options.ignoreCase) {
      return leftStr.toLowerCase() === rightStr.toLowerCase();
    }
    return leftStr === rightStr;
  }

  // 字符串比较（忽略大小写）
  if (typeof left === 'string' && typeof right === 'string' && options.ignoreCase) {
    return left.toLowerCase() === right.toLowerCase();
  }

  return false;
}

/**
 * 计算差异统计
 */
export function getDiffStats(diffs: DiffResult[]): DiffStats {
  const stats: DiffStats = {
    added: 0,
    deleted: 0,
    modified: 0,
    unchanged: 0,
  };

  diffs.forEach(diff => {
    stats[diff.type]++;
  });

  return stats;
}

/**
 * 筛选差异（仅返回有变化的部分）
 */
export function filterDiffs(diffs: DiffResult[], types?: DiffType[]): DiffResult[] {
  if (!types || types.length === 0) {
    return diffs.filter(diff => diff.type !== DiffType.UNCHANGED);
  }
  return diffs.filter(diff => types.includes(diff.type));
}

/**
 * 按路径排序键
 */
export function sortObjectKeys(obj: any, recursive: boolean = true): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return recursive ? obj.map(item => sortObjectKeys(item, recursive)) : obj;
  }

  const sorted: any = {};
  const keys = Object.keys(obj).sort();
  
  keys.forEach(key => {
    sorted[key] = recursive ? sortObjectKeys(obj[key], recursive) : obj[key];
  });

  return sorted;
}

/**
 * 移除空值
 */
export function removeEmptyValues(obj: any, options: {
  removeNull?: boolean;
  removeEmptyString?: boolean;
  removeEmptyObject?: boolean;
  removeEmptyArray?: boolean;
} = {}): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    const filtered = obj
      .map(item => removeEmptyValues(item, options))
      .filter(item => {
        if (options.removeNull && item === null) return false;
        if (options.removeEmptyString && item === '') return false;
        if (options.removeEmptyArray && Array.isArray(item) && item.length === 0) return false;
        if (options.removeEmptyObject && 
            typeof item === 'object' && 
            item !== null && 
            !Array.isArray(item) && 
            Object.keys(item).length === 0) return false;
        return true;
      });
    return filtered;
  }

  const result: any = {};
  Object.keys(obj).forEach(key => {
    const value = removeEmptyValues(obj[key], options);
    
    if (options.removeNull && value === null) return;
    if (options.removeEmptyString && value === '') return;
    if (options.removeEmptyArray && Array.isArray(value) && value.length === 0) return;
    if (options.removeEmptyObject && 
        typeof value === 'object' && 
        value !== null && 
        !Array.isArray(value) && 
        Object.keys(value).length === 0) return;
    
    result[key] = value;
  });

  return result;
}

/**
 * 转换键名格式
 */
export function convertKeyCase(obj: any, caseType: 'camel' | 'snake' | 'kebab', recursive: boolean = true): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return recursive ? obj.map(item => convertKeyCase(item, caseType, recursive)) : obj;
  }

  const result: any = {};
  Object.keys(obj).forEach(key => {
    const newKey = convertCase(key, caseType);
    result[newKey] = recursive ? convertKeyCase(obj[key], caseType, recursive) : obj[key];
  });

  return result;
}

/**
 * 转换字符串格式
 */
function convertCase(str: string, caseType: 'camel' | 'snake' | 'kebab'): string {
  switch (caseType) {
    case 'camel':
      return str
        .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
        .replace(/^(.)/, char => char.toLowerCase());
    case 'snake':
      return str
        .replace(/([A-Z])/g, '_$1')
        .replace(/[-\s]/g, '_')
        .toLowerCase()
        .replace(/^_/, '');
    case 'kebab':
      return str
        .replace(/([A-Z])/g, '-$1')
        .replace(/[_\s]/g, '-')
        .toLowerCase()
        .replace(/^-/, '');
    default:
      return str;
  }
}

/**
 * 查找下一个差异
 */
export function findNextDiff(diffs: DiffResult[], currentPath: string, direction: 'next' | 'prev' = 'next'): DiffResult | null {
  const changedDiffs = diffs.filter(diff => diff.type !== DiffType.UNCHANGED);
  if (changedDiffs.length === 0) return null;

  const currentIndex = changedDiffs.findIndex(diff => diff.path === currentPath);
  
  if (direction === 'next') {
    const nextIndex = currentIndex + 1;
    return nextIndex < changedDiffs.length ? changedDiffs[nextIndex] : changedDiffs[0];
  } else {
    const prevIndex = currentIndex - 1;
    return prevIndex >= 0 ? changedDiffs[prevIndex] : changedDiffs[changedDiffs.length - 1];
  }
}
