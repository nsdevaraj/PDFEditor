import React, { useState } from 'react';
import { 
  FileSignature, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MoreHorizontal, 
  Plus, 
  Search,
  Filter
} from 'lucide-react';
import { UploadedFile, SignatureRequest } from '../types';

interface ESignDashboardProps {
  onUpload: (file: UploadedFile) => void;
}

const mockRequests: SignatureRequest[] = [
  { id: '1', documentName: 'NDA - TechCorp Inc.pdf', recipient: 'john.doe@example.com', status: 'pending', date: '2023-10-24' },
  { id: '2', documentName: 'Service Agreement v2.pdf', recipient: 'sarah.smith@agency.com', status: 'signed', date: '2023-10-22' },
  { id: '3', documentName: 'Q4 Financial Report.pdf', recipient: 'finance@company.com', status: 'rejected', date: '2023-10-20' },
  { id: '4', documentName: 'Employment Contract.pdf', recipient: 'mike.ross@law.com', status: 'signed', date: '2023-10-18' },
];

export const ESignDashboard: React.FC<ESignDashboardProps> = ({ onUpload }) => {
  const [requests] = useState(mockRequests);

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
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'signed': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'signed': return <CheckCircle className="w-4 h-4 mr-1" />;
      case 'pending': return <Clock className="w-4 h-4 mr-1" />;
      case 'rejected': return <XCircle className="w-4 h-4 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 bg-slate-50 p-8 h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">eSign & Track</h2>
          <p className="text-slate-500 mt-1">Manage your signature requests and agreements</p>
        </div>
        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center space-x-2 font-medium transition-colors shadow-lg shadow-blue-200 hover:-translate-y-0.5 transform">
            <Plus className="w-5 h-5" />
            <span>Request Signature</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
        </label>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
             <div className="p-3 bg-amber-50 rounded-xl">
               <Clock className="w-6 h-6 text-amber-600" />
             </div>
             <span className="text-3xl font-bold text-slate-800">5</span>
          </div>
          <p className="text-slate-500 font-medium">Waiting for Others</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
             <div className="p-3 bg-emerald-50 rounded-xl">
               <CheckCircle className="w-6 h-6 text-emerald-600" />
             </div>
             <span className="text-3xl font-bold text-slate-800">128</span>
          </div>
          <p className="text-slate-500 font-medium">Completed</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <div className="flex items-center justify-between mb-4">
             <div className="p-3 bg-blue-50 rounded-xl">
               <FileSignature className="w-6 h-6 text-blue-600" />
             </div>
             <span className="text-3xl font-bold text-slate-800">2</span>
          </div>
          <p className="text-slate-500 font-medium">Action Required</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-t-2xl border border-slate-200 border-b-0 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input type="text" placeholder="Search documents..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
            <button className="flex items-center space-x-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
            </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-b-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                    <th className="p-4">Document</th>
                    <th className="p-4">Recipient</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {requests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-red-50 rounded-lg">
                                    <FileSignature className="w-5 h-5 text-red-500" />
                                </div>
                                <span className="font-medium text-slate-900">{req.documentName}</span>
                            </div>
                        </td>
                        <td className="p-4 text-slate-600">{req.recipient}</td>
                        <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(req.status)}`}>
                                {getStatusIcon(req.status)}
                                {req.status}
                            </span>
                        </td>
                        <td className="p-4 text-slate-500 text-sm">{req.date}</td>
                        <td className="p-4 text-right">
                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
            <button className="text-sm text-blue-600 font-medium hover:text-blue-700">View All Activity</button>
        </div>
      </div>
    </div>
  );
};