import React from 'react';

interface JsonViewerPathBarProps {
  path: string;
  copySuccess: boolean;
  onCopy: () => void;
  title: string;
  containerClassName: string;
  valueClassName: string;
  buttonClassName: string;
}

const JsonViewerPathBar: React.FC<JsonViewerPathBarProps> = ({
  path,
  copySuccess,
  onCopy,
  title,
  containerClassName,
  valueClassName,
  buttonClassName,
}) => {
  if (!path) {
    return null;
  }

  return (
    <div className={containerClassName}>
      <code className={valueClassName}>{path}</code>
      <button
        className={`${buttonClassName} ${copySuccess ? 'success' : ''}`}
        onClick={onCopy}
        title={title}
      >
        {copySuccess ? '✓' : '📋'}
      </button>
    </div>
  );
};

export default JsonViewerPathBar;

