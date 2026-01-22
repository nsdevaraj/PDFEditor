import React from 'react';
import { 
  User, 
  Bell, 
  Lock, 
  Cloud, 
  CreditCard, 
  Check, 
  Globe,
  Monitor,
  HardDrive
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="flex-1 bg-slate-50 p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
            <p className="text-slate-500 mt-1">Manage your account preferences and integrations</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Sidebar Navigation for Settings (Visual only) */}
            <div className="md:col-span-1 space-y-1">
                <button className="w-full flex items-center space-x-3 px-4 py-3 bg-white text-blue-600 font-medium rounded-xl shadow-sm border border-slate-200">
                    <User className="w-5 h-5" />
                    <span>My Account</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 font-medium rounded-xl transition-colors">
                    <Cloud className="w-5 h-5" />
                    <span>Cloud Storage</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 font-medium rounded-xl transition-colors">
                    <Lock className="w-5 h-5" />
                    <span>Security</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 font-medium rounded-xl transition-colors">
                    <Bell className="w-5 h-5" />
                    <span>Notifications</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 font-medium rounded-xl transition-colors">
                    <CreditCard className="w-5 h-5" />
                    <span>Billing & Plan</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="md:col-span-2 space-y-6">
                
                {/* Profile Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Profile Information</h3>
                    <div className="flex items-center space-x-6 mb-8">
                        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            AL
                        </div>
                        <div>
                            <button className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                Change Avatar
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">First Name</label>
                            <input type="text" defaultValue="Alex" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Name</label>
                            <input type="text" defaultValue="Lumina" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                            <input type="email" defaultValue="alex@luminapdf.com" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                    </div>
                    <div className="mt-6 text-right">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                            Save Changes
                        </button>
                    </div>
                </div>

                {/* Preferences */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                     <h3 className="text-lg font-bold text-slate-900 mb-6">Preferences</h3>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                             <div className="flex items-center space-x-3">
                                 <Globe className="w-5 h-5 text-slate-400" />
                                 <div>
                                     <p className="font-medium text-slate-900">Language</p>
                                     <p className="text-xs text-slate-500">English (US)</p>
                                 </div>
                             </div>
                             <button className="text-blue-600 text-sm font-medium hover:underline">Change</button>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                             <div className="flex items-center space-x-3">
                                 <Monitor className="w-5 h-5 text-slate-400" />
                                 <div>
                                     <p className="font-medium text-slate-900">Theme</p>
                                     <p className="text-xs text-slate-500">System Default</p>
                                 </div>
                             </div>
                             <button className="text-blue-600 text-sm font-medium hover:underline">Change</button>
                        </div>
                     </div>
                </div>

                {/* Integrations */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Connected Accounts</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-slate-100 rounded-lg">
                                    <HardDrive className="w-5 h-5 text-slate-600" />
                                </div>
                                <span className="font-medium text-slate-900">Google Drive</span>
                            </div>
                            <button className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50">
                                Connect
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Cloud className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <span className="font-medium text-slate-900 block">Dropbox</span>
                                    <span className="text-xs text-emerald-600 font-medium flex items-center">
                                        <Check className="w-3 h-3 mr-1" /> Connected
                                    </span>
                                </div>
                            </div>
                            <button className="text-red-600 text-sm font-medium hover:underline px-3">
                                Disconnect
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};