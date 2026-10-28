'use client';

import { useState } from 'react';
import { TabOverview } from './tab-overview';
import { TabTemplateLayout } from './tab-template-layout';
import { TabCertificates } from './tab-certificates';
import { TabImport } from './tab-import';
import { LayoutDashboard, Image as ImageIcon, Award, Upload } from 'lucide-react';

interface EventTabsProps {
  event: any;
  certificates: any[];
}

export function EventTabs({ event, certificates }: EventTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'template' | 'certificates' | 'import'>('overview');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-[#E9EBED] bg-white px-4">
        <nav className="flex space-x-6 overflow-x-auto text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-xs sm:text-sm ${
              activeTab === 'overview'
                ? 'border-[#FF9900] text-[#0F1B2A]'
                : 'border-transparent text-[#5F6B7A] hover:text-[#0F1B2A]'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-xs sm:text-sm ${
              activeTab === 'template'
                ? 'border-[#FF9900] text-[#0F1B2A]'
                : 'border-transparent text-[#5F6B7A] hover:text-[#0F1B2A]'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            <span>Template & Layout</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-xs sm:text-sm ${
              activeTab === 'certificates'
                ? 'border-[#FF9900] text-[#0F1B2A]'
                : 'border-transparent text-[#5F6B7A] hover:text-[#0F1B2A]'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>Certificates ({certificates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-xs sm:text-sm ${
              activeTab === 'import'
                ? 'border-[#FF9900] text-[#0F1B2A]'
                : 'border-transparent text-[#5F6B7A] hover:text-[#0F1B2A]'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Import Attendee List</span>
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'overview' && (
          <TabOverview event={event} certificateCount={certificates.length} />
        )}
        {activeTab === 'template' && <TabTemplateLayout event={event} />}
        {activeTab === 'certificates' && (
          <TabCertificates eventId={event.id} initialCertificates={certificates} />
        )}
        {activeTab === 'import' && <TabImport eventId={event.id} />}
      </div>
    </div>
  );
}
