export type SessionMessageType =
  | 'status'
  | 'transcript'
  | 'translation'
  | 'summary'
  | 'error';

export interface SessionMessage {
  type: SessionMessageType;
  payload: string;
  language?: string;
  timestamp: string;
}
