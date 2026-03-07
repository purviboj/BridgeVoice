import { SessionMessage } from '@/types/session';
import { getSessionWsUrl } from '@/lib/api';

export function createSessionSocket(
  sessionId: string,
  onMessage: (msg: SessionMessage) => void,
  onOpen?: () => void,
  onClose?: () => void
): WebSocket {
  const url = getSessionWsUrl(sessionId);

  const socket = new WebSocket(url);

  socket.onopen = () => onOpen?.();
  socket.onclose = () => onClose?.();
  socket.onmessage = (event) => {
    const parsed = JSON.parse(event.data) as SessionMessage;
    onMessage(parsed);
  };

  return socket;
}
