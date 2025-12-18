/**
 * JSON 合并工具
 * 用于合并两个 JSON 对象
 */

import { DiffResult, DiffType } from './jsonDiff';

export enum MergeStrategy {
  USE_LEFT = 'use-left',
  USE_RIGHT = 'use-right',
  SMART_MERGE = 'smart-merge',
  MANUAL = 'manual',
}

export interface MergeDecision {
  path: string;
  strategy: MergeStrategy;
  value?: any;
}

/**
 * 合并两个 JSON 对象
 */
export function mergeJson(
  left: any,
  right: any,
  strategy: MergeStrategy = MergeStrategy.SMART_MERGE,
  decisions?: Map<string, MergeDecision>
): any {
  switch (strategy) {
    case MergeStrategy.USE_LEFT:
      return left;
    case MergeStrategy.USE_RIGHT:
      return right;
    case MergeStrategy.SMART_MERGE:
      return smartMerge(left, right);
    case MergeStrategy.MANUAL:
      return manualMerge(left, right, decisions || new Map());
    default:
      return left;
  }
}

/**
 * 智能合并：保留两侧特有内容，冲突时优先使用右侧
 */
function smartMerge(left: any, right: any): any {
  // 处理 null 和 undefined
  if (left === null || left === undefined) return right;
  if (right === null || right === undefined) return left;

  // 获取类型
  const leftType = typeof left;
  const rightType = typeof right;

  // 类型不同，使用右侧
  if (leftType !== rightType) return right;

  // 基本类型，使用右侧
  if (leftType !== 'object') return right;

  // 数组合并：连接并去重
  if (Array.isArray(left) && Array.isArray(right)) {
    return [...left, ...right.filter(item => !left.includes(item))];
  }

  // 一个是数组一个是对象，使用右侧
  if (Array.isArray(left) !== Array.isArray(right)) {
    return right;
  }

  // 对象合并
  const result: any = { ...left };
  
  Object.keys(right).forEach(key => {
    if (!(key in left)) {
      // 右侧独有的键，直接添加
      result[key] = right[key];
    } else {
      // 两侧都有的键，递归合并
      result[key] = smartMerge(left[key], right[key]);
    }
  });

  return result;
}

/**
 * 手动合并：根据用户决策合并
 */
function manualMerge(left: any, right: any, decisions: Map<string, MergeDecision>, basePath: string = '$'): any {
  // 检查是否有针对当前路径的决策
  const decision = decisions.get(basePath);
  if (decision) {
    switch (decision.strategy) {
      case MergeStrategy.USE_LEFT:
        return left;
      case MergeStrategy.USE_RIGHT:
        return right;
      default:
        if (decision.value !== undefined) {
          return decision.value;
        }
    }
  }

  // 处理 null 和 undefined
  if (left === null || left === undefined) return right;
  if (right === null || right === undefined) return left;

  // 获取类型
  const leftType = typeof left;
  const rightType = typeof right;

  // 类型不同，需要决策
  if (leftType !== rightType) {
    // 默认使用右侧
    return right;
  }

  // 基本类型
  if (leftType !== 'object') {
    return left === right ? left : right;
  }

  // 数组合并
  if (Array.isArray(left) && Array.isArray(right)) {
    const maxLength = Math.max(left.length, right.length);
    const result: any[] = [];
    
    for (let i = 0; i < maxLength; i++) {
      const itemPath = `${basePath}[${i}]`;
      if (i >= left.length) {
        result.push(right[i]);
      } else if (i >= right.length) {
        result.push(left[i]);
      } else {
        result.push(manualMerge(left[i], right[i], decisions, itemPath));
      }
    }
    
    return result;
  }

  // 对象合并
  const result: any = {};
  const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);

  allKeys.forEach(key => {
    const keyPath = `${basePath}.${key}`;
    
    if (!(key in left)) {
      result[key] = right[key];
    } else if (!(key in right)) {
      result[key] = left[key];
    } else {
      result[key] = manualMerge(left[key], right[key], decisions, keyPath);
    }
  });

  return result;
}

/**
 * 从差异列表生成合并结果
 */
export function mergeFromDiffs(
  left: any,
  right: any,
  diffs: DiffResult[],
  strategy: MergeStrategy = MergeStrategy.SMART_MERGE
): any {
  if (strategy === MergeStrategy.USE_LEFT) return left;
  if (strategy === MergeStrategy.USE_RIGHT) return right;

  // 对于智能合并，使用 smartMerge
  return smartMerge(left, right);
}

/**
 * 生成 JSON Patch (RFC 6902) 格式的补丁
 */
export interface JsonPatch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
  from?: string;
}

export function generateJsonPatch(diffs: DiffResult[]): JsonPatch[] {
  const patches: JsonPatch[] = [];

  diffs.forEach(diff => {
    // 转换 JSONPath 到 JSON Pointer 格式
    const path = jsonPathToPointer(diff.path);

    switch (diff.type) {
      case DiffType.ADDED:
        patches.push({
          op: 'add',
          path,
          value: diff.rightValue,
        });
        break;
      case DiffType.DELETED:
        patches.push({
          op: 'remove',
          path,
        });
        break;
      case DiffType.MODIFIED:
        patches.push({
          op: 'replace',
          path,
          value: diff.rightValue,
        });
        break;
      // UNCHANGED 不生成补丁
    }
  });

  return patches;
}

/**
 * 将 JSONPath 转换为 JSON Pointer (RFC 6901)
 */
function jsonPathToPointer(jsonPath: string): string {
  // 移除开头的 $
  let path = jsonPath.replace(/^\$/, '');
  
  // 转换 .key 为 /key
  path = path.replace(/\.([^.[]+)/g, '/$1');
  
  // 转换 [index] 为 /index
  path = path.replace(/\[(\d+)\]/g, '/$1');
  
  // 如果为空，返回根路径
  return path || '/';
}

/**
 * 应用 JSON Patch
 */
export function applyJsonPatch(obj: any, patches: JsonPatch[]): any {
  let result = JSON.parse(JSON.stringify(obj)); // 深拷贝

  patches.forEach(patch => {
    const pathParts = patch.path.split('/').filter(p => p);
    
    switch (patch.op) {
      case 'add':
      case 'replace':
        result = setValue(result, pathParts, patch.value);
        break;
      case 'remove':
        result = removeValue(result, pathParts);
        break;
    }
  });

  return result;
}

/**
 * 设置嵌套值
 */
function setValue(obj: any, pathParts: string[], value: any): any {
  if (pathParts.length === 0) return value;

  const result = Array.isArray(obj) ? [...obj] : { ...obj };
  const [current, ...rest] = pathParts;
  const key = Array.isArray(result) ? parseInt(current, 10) : current;

  if (rest.length === 0) {
    result[key] = value;
  } else {
    result[key] = setValue(result[key] || {}, rest, value);
  }

  return result;
}

/**
 * 删除嵌套值
 */
function removeValue(obj: any, pathParts: string[]): any {
  if (pathParts.length === 0) return undefined;
  if (pathParts.length === 1) {
    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    
    if (Array.isArray(result)) {
      const key = parseInt(pathParts[0], 10);
      result.splice(key, 1);
    } else {
      const key = pathParts[0];
      delete result[key];
    }
    
    return result;
  }

  const result = Array.isArray(obj) ? [...obj] : { ...obj };
  const [current, ...rest] = pathParts;
  const key = Array.isArray(result) ? parseInt(current, 10) : current;
  
  result[key] = removeValue(result[key], rest);
  
  return result;
}
