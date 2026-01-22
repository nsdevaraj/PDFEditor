import React, { useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  FileText, 
  ClipboardList,
  LayoutTemplate,
  FileCheck
} from 'lucide-react';
import { AppView, UploadedFile } from '../types';

// Minimal valid PDF base64 for templates (A4 size page)
const SAMPLE_PDF = "JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmogCjw8CiAgL1R5cGUgL1BhZ2VzCiAgL01lZGlhQm94IFsgMCAwIDU5NSA4NDIgXQogIC9Db3VudCAxCiAgL0tpZHMgWyAzIDAgUiBdCj4+CmVuZG9iagoKMyAwIG9iago8PAogIC9UeXBlIC9QYWdlCiAgL1BhcmVudCAyIDAgUHIKICAvUmVzb3VyY2VzIDw8CiAgICAvRm9udCA8PAogICAgICAvRjEgNCAwIFIKICAgID4+CiAgPj4KICAvQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8CiAgL1R5cGUgL0ZvbnQKICAvU3VidHlwZSAvVHlwZTEKICAvQmFzZUZvbnQgL1RpbWVzLVJvbWFuCj4+CmVuZG9iagoKNSAwIG9iago8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDc1MCBURECiL0YxIDI0IFRmCihUZW1wbGF0ZTogRm9ybSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDE1NyAwMDAwMCBuIAowMDAwMDAwMjY1IDAwMDAwIG4gCjAwMDAwMDAzNTQgMDAwMDAgbiAgCnRyYWlsZXIKPDwKICAvU2l6ZSA2CiAgL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQyNQolJUVPRgo=";

interface FormsPageProps {
  onUpload: (file: UploadedFile) => void;
  onChangeView: (view: AppView) => void;
}

export const FormsPage: React.FC<FormsPageProps> = ({ onUpload, onChangeView }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templates = [
    { name: "Invoice", color: "bg-blue-100 text-blue-600" },
    { name: "Job Application", color: "bg-purple-100 text-purple-600" },
    { name: "Rental Agreement", color: "bg-emerald-100 text-emerald-600" },
    { name: "Medical History", color: "bg-orange-100 text-orange-600" },
  ];

  const recentForms = [
    { id: 1, name: "Q3_Expense_Report.pdf", status: "Draft", modified: "2 hours ago" },
    { id: 2, name: "New_Client_Intake.pdf", status: "Completed", modified: "1 day ago" },
    { id: 3, name: "Event_Registration_2024.pdf", status: "Shared", modified: "3 days ago" },
  ];

  const handleCreateNew = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileUrl = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const fullBase64 = event.target.result as string;
          const content = fullBase64.split(',')[1];
          onUpload({
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: fullBase64,
            content: content,
            lastModified: file.lastModified,
            fileUrl: fileUrl
          });
          onChangeView(AppView.EDITOR);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTemplateClick = (templateName: string) => {
    // Simulate loading a template file
    const fakeFile: UploadedFile = {
        name: `${templateName}_Template.pdf`,
        type: 'application/pdf',
        size: 1024,
        dataUrl: `data:application/pdf;base64,${SAMPLE_PDF}`,
        content: SAMPLE_PDF,
        lastModified: Date.now(),
    };
    onUpload(fakeFile);
    onChangeView(AppView.EDITOR);
  };

  return (
    <div className="flex-1 bg-slate-50 p-8 h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Forms</h2>
          <p className="text-slate-500 mt-1">Create, fill, and distribute PDF forms</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center space-x-2 font-medium transition-colors shadow-lg shadow-blue-200 hover:-translate-y-0.5 transform"
        >
            <Plus className="w-5 h-5" />
            <span>Create New Form</span>
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
        </button>
      </div>

      {/* Templates Section */}
      <div className="mb-10">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <LayoutTemplate className="w-5 h-5 mr-2 text-slate-500" />
            Start from a Template
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {templates.map((t, i) => (
                <div 
                  key={i} 
                  onClick={() => handleTemplateClick(t.name)}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className={`h-32 rounded-lg mb-4 ${t.color} flex items-center justify-center`}>
                        <FileText className="w-10 h-10 opacity-50 group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="font-semibold text-slate-900">{t.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">Click to edit</p>
                </div>
            ))}
        </div>
      </div>

      {/* Recent Forms Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <ClipboardList className="w-5 h-5 mr-2 text-slate-500" />
                Recent Forms
            </h3>
            <div className="flex items-center space-x-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input type="text" placeholder="Search forms..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                    <Filter className="w-4 h-4" />
                </button>
            </div>
        </div>

        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                <tr>
                    <th className="p-4 border-b border-slate-200">Name</th>
                    <th className="p-4 border-b border-slate-200">Status</th>
                    <th className="p-4 border-b border-slate-200">Last Modified</th>
                    <th className="p-4 border-b border-slate-200 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {recentForms.map((form) => (
                    <tr key={form.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <FileCheck className="w-5 h-5 text-blue-600" />
                                </div>
                                <span className="font-medium text-slate-900">{form.name}</span>
                            </div>
                        </td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                form.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                form.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                                'bg-purple-100 text-purple-700'
                            }`}>
                                {form.status}
                            </span>
                        </td>
                        <td className="p-4 text-sm text-slate-500">{form.modified}</td>
                        <td className="p-4 text-right">
                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};