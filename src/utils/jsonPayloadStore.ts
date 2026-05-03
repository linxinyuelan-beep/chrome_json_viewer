const PAYLOAD_PREFIX = 'jsonPayload:';

type ChromeStorageArea = chrome.storage.StorageArea;

function getStorageArea(): ChromeStorageArea {
  return chrome.storage.session || chrome.storage.local;
}

function createPayloadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function toStorageKey(payloadId: string): string {
  return `${PAYLOAD_PREFIX}${payloadId}`;
}

export async function saveJsonPayload(jsonString: string): Promise<string> {
  const payloadId = createPayloadId();
  const storageKey = toStorageKey(payloadId);

  await getStorageArea().set({
    [storageKey]: {
      jsonString,
      createdAt: Date.now(),
    },
  });

  return payloadId;
}

export async function loadJsonPayload(payloadId: string): Promise<string | null> {
  if (!payloadId) {
    return null;
  }

  const storageKey = toStorageKey(payloadId);
  const result = await getStorageArea().get(storageKey);
  const payload = result[storageKey];

  if (!payload || typeof payload.jsonString !== 'string') {
    return null;
  }

  return payload.jsonString;
}

export async function consumeJsonPayload(payloadId: string): Promise<string | null> {
  const jsonString = await loadJsonPayload(payloadId);
  if (jsonString !== null) {
    await deleteJsonPayload(payloadId);
  }
  return jsonString;
}

export async function deleteJsonPayload(payloadId: string): Promise<void> {
  if (!payloadId) {
    return;
  }

  await getStorageArea().remove(toStorageKey(payloadId));
}
