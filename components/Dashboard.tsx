import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { FilePlus, Upload, ShieldCheck, History } from 'lucide-react';
import { AppView, UploadedFile } from '../types';

interface DashboardProps {
  onUpload: (file: UploadedFile) => void;
  onChangeView: (view: AppView) => void;
}

const data = [
  { name: 'Mon', sent: 4, signed: 2 },
  { name: 'Tue', sent: 3, signed: 3 },
  { name: 'Wed', sent: 7, signed: 5 },
  { name: 'Thu', sent: 2, signed: 1 },
  { name: 'Fri', sent: 5, signed: 4 },
];

const pieData = [
  { name: 'Completed', value: 400 },
  { name: 'Pending', value: 300 },
  { name: 'Draft', value: 100 },
];

const COLORS = ['#10b981', '#f59e0b', '#64748b'];

export const Dashboard: React.FC<DashboardProps> = ({ onUpload, onChangeView }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create a Blob URL for efficient preview
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

  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto h-full">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Welcome back, Alex</h2>
        <p className="text-slate-500 mt-1">Here is what's happening with your documents today.</p>
      </header>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <label className="cursor-pointer group relative bg-blue-600 rounded-2xl p-6 shadow-lg shadow-blue-200 transition-transform hover:-translate-y-1 overflow-hidden">
          <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          <div className="relative z-10">
            <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <Upload className="text-white w-6 h-6" />
            </div>
            <h3 className="text-white font-bold text-lg">Upload PDF</h3>
            <p className="text-blue-100 text-sm mt-1">Edit, sign, or analyze</p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform"></div>
        </label>

        <div onClick={() => onChangeView(AppView.CONVERT)} className="cursor-pointer bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all hover:-translate-y-1">
          <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
            <FilePlus className="text-purple-600 w-6 h-6" />
          </div>
          <h3 className="text-slate-900 font-bold text-lg">Create PDF</h3>
          <p className="text-slate-500 text-sm mt-1">From Word, Excel, or Images</p>
        </div>

        <div onClick={() => onChangeView(AppView.SIGN)} className="cursor-pointer bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all hover:-translate-y-1">
          <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
            <ShieldCheck className="text-emerald-600 w-6 h-6" />
          </div>
          <h3 className="text-slate-900 font-bold text-lg">Request Signatures</h3>
          <p className="text-slate-500 text-sm mt-1">Track status in real-time</p>
        </div>

        <div className="cursor-pointer bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all hover:-translate-y-1">
          <div className="bg-orange-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
            <History className="text-orange-600 w-6 h-6" />
          </div>
          <h3 className="text-slate-900 font-bold text-lg">Recent Files</h3>
          <p className="text-slate-500 text-sm mt-1">Resume where you left off</p>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Signature Activity</h3>
            <select className="bg-slate-50 border-none text-sm text-slate-500 rounded-lg p-2 cursor-pointer outline-none hover:bg-slate-100">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="signed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
           <h3 className="text-lg font-bold text-slate-800 mb-2">Document Status</h3>
           <div className="h-64 relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={pieData}
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {pieData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-3xl font-bold text-slate-800">800</span>
                <span className="text-xs text-slate-400 uppercase tracking-wide">Total</span>
             </div>
           </div>
           <div className="space-y-3 mt-2">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index]}}></div>
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800">{item.value}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};