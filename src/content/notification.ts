import { NOTIFICATION_UI } from '../config/uiConstants';

export type NotificationType = 'success' | 'error' | 'info';

export function showNotification(
  message: string,
  type: NotificationType = 'info'
): void {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.padding = '10px 20px';
  notification.style.color = 'white';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = NOTIFICATION_UI.Z_INDEX;
  notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  notification.style.transition = 'opacity 0.5s';
  notification.style.fontSize = '14px';

  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#4caf50';
      break;
    case 'error':
      notification.style.backgroundColor = '#f44336';
      break;
    case 'info':
      notification.style.backgroundColor = '#2196f3';
      break;
  }

  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, NOTIFICATION_UI.FADE_MS);
  }, NOTIFICATION_UI.DURATION_MS);
}
