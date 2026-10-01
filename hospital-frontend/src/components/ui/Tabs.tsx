import React from 'react';
import { clsx } from 'clsx';

export interface Tab {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="border-b border-slate-200 flex gap-6">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'pb-3 text-sm font-medium transition-all relative flex items-center gap-2 focus:outline-none',
              isActive ? 'text-teal-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'px-2 py-0.5 text-xs rounded-full font-bold',
                  isActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                )}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-700 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
