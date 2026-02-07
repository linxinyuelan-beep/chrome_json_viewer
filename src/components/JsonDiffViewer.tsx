import React, { useMemo } from 'react';
import { DiffResult, DiffType } from '../utils/jsonDiff';

interface DiffViewerLabels {
  deletedValueLabel: string;
  addedValueLabel: string;
  beforeValueLabel: string;
  afterValueLabel: string;
}

interface JsonDiffViewerProps {
  diffs: DiffResult[];
  showOnlyDiffs?: boolean;
  onDiffClick?: (diff: DiffResult) => void;
  activeDiff?: string;
  labels?: DiffViewerLabels;
}

/**
 * JSON 差异可视化组件
 */
const JsonDiffViewer: React.FC<JsonDiffViewerProps> = ({
  diffs,
  showOnlyDiffs = false,
  onDiffClick,
  activeDiff,
  labels,
}) => {
  // 过滤要显示的差异
  const displayDiffs = useMemo(() => {
    if (showOnlyDiffs) {
      return diffs.filter(diff => diff.type !== DiffType.UNCHANGED);
    }
    return diffs;
  }, [diffs, showOnlyDiffs]);

  // 按路径分组，用于显示层级结构
  const groupedDiffs = useMemo(() => {
    return groupDiffsByPath(displayDiffs);
  }, [displayDiffs]);

  return (
    <div className="json-diff-viewer">
      {groupedDiffs.map((group, index) => (
        <DiffGroup
          key={index}
          group={group}
          onDiffClick={onDiffClick}
          activeDiff={activeDiff}
          labels={labels}
        />
      ))}
    </div>
  );
};

interface DiffGroup {
  path: string;
  diffs: DiffResult[];
  children: DiffGroup[];
}

interface DiffGroupProps {
  group: DiffGroup;
  onDiffClick?: (diff: DiffResult) => void;
  activeDiff?: string;
  level?: number;
  labels?: DiffViewerLabels;
}

const DiffGroup: React.FC<DiffGroupProps> = ({
  group,
  onDiffClick,
  activeDiff,
  level = 0,
  labels,
}) => {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div className="diff-group" style={{ marginLeft: `${level * 20}px` }}>
      {group.path !== '$' && (
        <div
          className="diff-group-header"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
          <span className="group-path">{getPathName(group.path)}</span>
        </div>
      )}
      {expanded && (
        <div className="diff-group-content">
          {group.diffs.map((diff, index) => (
            <DiffLine
              key={index}
              diff={diff}
              onClick={onDiffClick}
              isActive={activeDiff === diff.path}
              labels={labels}
            />
          ))}
          {group.children.map((child, index) => (
            <DiffGroup
              key={index}
              group={child}
              onDiffClick={onDiffClick}
              activeDiff={activeDiff}
              level={level + 1}
              labels={labels}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface DiffLineProps {
  diff: DiffResult;
  onClick?: (diff: DiffResult) => void;
  isActive?: boolean;
  labels?: DiffViewerLabels;
}

const DiffLine: React.FC<DiffLineProps> = ({ diff, onClick, isActive, labels }) => {
  const getDiffClassName = (type: DiffType): string => {
    switch (type) {
      case DiffType.ADDED:
        return 'diff-added';
      case DiffType.DELETED:
        return 'diff-deleted';
      case DiffType.MODIFIED:
        return 'diff-modified';
      default:
        return 'diff-unchanged';
    }
  };

  const getDiffSymbol = (type: DiffType): string => {
    switch (type) {
      case DiffType.ADDED:
        return '+';
      case DiffType.DELETED:
        return '-';
      case DiffType.MODIFIED:
        return '~';
      default:
        return ' ';
    }
  };

  const formatValue = (value: any): string => {
    if (value === undefined) return '';
    if (value === null) return 'null';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div
      className={`diff-line ${getDiffClassName(diff.type)} ${isActive ? 'active' : ''}`}
      onClick={() => onClick?.(diff)}
    >
      <span className="diff-symbol">{getDiffSymbol(diff.type)}</span>
      <span className="diff-path">{diff.path}</span>
      <div className="diff-values">
        {diff.type === DiffType.DELETED && (
          <div className="diff-value deleted">
            <span className="value-label">{labels?.deletedValueLabel || 'Deleted'}:</span>
            <pre>{formatValue(diff.leftValue)}</pre>
          </div>
        )}
        {diff.type === DiffType.ADDED && (
          <div className="diff-value added">
            <span className="value-label">{labels?.addedValueLabel || 'Added'}:</span>
            <pre>{formatValue(diff.rightValue)}</pre>
          </div>
        )}
        {diff.type === DiffType.MODIFIED && (
          <div className="diff-value modified">
            <div className="value-before">
              <span className="value-label">{labels?.beforeValueLabel || 'Before'}:</span>
              <pre>{formatValue(diff.leftValue)}</pre>
            </div>
            <div className="value-after">
              <span className="value-label">{labels?.afterValueLabel || 'After'}:</span>
              <pre>{formatValue(diff.rightValue)}</pre>
            </div>
          </div>
        )}
        {diff.type === DiffType.UNCHANGED && (
          <div className="diff-value unchanged">
            <pre>{formatValue(diff.leftValue)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 按路径分组差异
 */
function groupDiffsByPath(diffs: DiffResult[]): DiffGroup[] {
  const root: DiffGroup = {
    path: '$',
    diffs: [],
    children: [],
  };

  diffs.forEach(diff => {
    const pathParts = diff.path.split('.').filter(p => p && p !== '$');
    
    if (pathParts.length === 0) {
      root.diffs.push(diff);
      return;
    }

    let currentGroup = root;
    let currentPath = '$';

    pathParts.forEach((part, index) => {
      currentPath += `.${part}`;
      
      let childGroup = currentGroup.children.find(c => c.path === currentPath);
      
      if (!childGroup) {
        childGroup = {
          path: currentPath,
          diffs: [],
          children: [],
        };
        currentGroup.children.push(childGroup);
      }

      if (index === pathParts.length - 1) {
        childGroup.diffs.push(diff);
      }

      currentGroup = childGroup;
    });
  });

  return root.children.length > 0 ? root.children : [root];
}

/**
 * 获取路径的显示名称
 */
function getPathName(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1] || path;
}

export default JsonDiffViewer;
