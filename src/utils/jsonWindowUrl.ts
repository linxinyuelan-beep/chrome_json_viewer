export function createJsonWindowPath(payloadId?: string): string {
  if (!payloadId) {
    return 'json-window.html';
  }

  return `json-window.html?payloadId=${encodeURIComponent(payloadId)}`;
}

export function createPopupWindowFeatures(width: number, height: number): string {
  return `width=${width},height=${height},scrollbars=yes,resizable=yes`;
}
