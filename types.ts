export enum AppView {
  DASHBOARD = 'DASHBOARD',
  EDITOR = 'EDITOR',
  CONVERT = 'CONVERT',
  SIGN = 'SIGN',
  FORMS = 'FORMS',
  SETTINGS = 'SETTINGS'
}

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  dataUrl: string; // Base64 full string
  content: string; // Base64 raw content (split from header)
  lastModified: number;
  fileUrl?: string; // Blob URL for efficient preview
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export interface SignatureRequest {
  id: string;
  recipient: string;
  status: 'pending' | 'signed' | 'rejected';
  date: string;
  documentName: string;
}

export interface ToolAction {
  id: string;
  icon: any;
  label: string;
  description: string;
  category: 'edit' | 'create' | 'convert' | 'protect';
}