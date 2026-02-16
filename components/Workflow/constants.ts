import {
  FileText,
  Image,
  FileSpreadsheet,
  FileOutput,
  Split,
  Merge,
  Scissors,
  Lock,
  Unlock,
  Eye,
  Eraser,
  RotateCw,
  ArrowLeftRight,
  Crop,
  Wrench,
  Globe,
  Layers,
  Camera,
  Hash
} from 'lucide-react';
import { WorkflowToolId } from '../../services/workflowActions';

export const TOOL_DEFINITIONS: Record<WorkflowToolId, { title: string; icon: any; color: string; bg: string }> = {
  'merge': { title: "Merge PDF", icon: Merge, color: "text-red-600", bg: "bg-red-100" },
  'split': { title: "Split / Extract", icon: Split, color: "text-cyan-600", bg: "bg-cyan-100" },
  'rotate': { title: "Rotate PDF", icon: RotateCw, color: "text-blue-600", bg: "bg-blue-100" },
  'organize': { title: "Organize PDF", icon: ArrowLeftRight, color: "text-purple-600", bg: "bg-purple-100" },
  'compress': { title: "Compress PDF", icon: Scissors, color: "text-pink-600", bg: "bg-pink-100" },
  'flatten': { title: "Flatten PDF", icon: Layers, color: "text-purple-600", bg: "bg-purple-100" },
  'protect': { title: "Protect PDF", icon: Lock, color: "text-indigo-600", bg: "bg-indigo-100" },
  'unlock': { title: "Unlock PDF", icon: Unlock, color: "text-teal-600", bg: "bg-teal-100" },
  'repair': { title: "Repair PDF", icon: Wrench, color: "text-red-600", bg: "bg-red-100" },
  'ocr': { title: "OCR", icon: Eye, color: "text-yellow-600", bg: "bg-yellow-100" },
  'pdf-to-word': { title: "PDF to Word", icon: FileText, color: "text-blue-600", bg: "bg-blue-100" },
  'pdf-to-excel': { title: "PDF to Excel", icon: FileSpreadsheet, color: "text-green-600", bg: "bg-green-100" },
  'pdf-to-ppt': { title: "PDF to PPT", icon: FileOutput, color: "text-orange-600", bg: "bg-orange-100" },
  'pdf-to-image': { title: "PDF to Image", icon: Image, color: "text-purple-600", bg: "bg-purple-100" },
  'word-to-pdf': { title: "Word to PDF", icon: FileText, color: "text-blue-600", bg: "bg-blue-100" },
  'excel-to-pdf': { title: "Excel to PDF", icon: FileSpreadsheet, color: "text-green-600", bg: "bg-green-100" },
  'ppt-to-pdf': { title: "PPT to PDF", icon: FileOutput, color: "text-orange-600", bg: "bg-orange-100" },
  'image-to-pdf': { title: "Image to PDF", icon: Image, color: "text-purple-600", bg: "bg-purple-100" },
  'html-to-pdf': { title: "HTML to PDF", icon: Globe, color: "text-pink-600", bg: "bg-pink-100" },
};

export const INITIAL_NODES = [
  {
    id: '1',
    type: 'tool',
    position: { x: 250, y: 100 },
    data: { toolId: 'merge', label: 'Merge PDF' },
  },
];
