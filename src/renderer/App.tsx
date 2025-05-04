import React, { useState, useEffect } from 'react';
import { TableTab } from './TableTab';
import { FilterExpression } from './components/FilterSection';
import { Settings } from './components/Settings';
import { useSettings } from './hooks/useSettings';

interface Tab {
  id: string;
  tableName: string;
  initialFilters?: FilterExpression[]; // Add initialFilters for new tabs
}

export const App: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([{ id: '1', tableName: '' }]);
  const [activeTab, setActiveTab] = useState('1');
  const { showSettings, hasSettings, saveSettings, openSettings, closeSettings } = useSettings();

  const addTab = (tableName = '', initialFilters: FilterExpression[] = []) => {
    const newTab = {
      id: Date.now().toString(),
      tableName,
      initialFilters
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newTab.id);
    
    return newTab.id; // Return the new tab ID
  };

  // Function to open a new tab with a table and filters for the findById feature
  const openNewTab = (tableName: string, filters: FilterExpression[]) => {
    addTab(tableName, filters);
  };

  const updateTabName = (tabId: string, tableName: string) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId ? { ...tab, tableName } : tab
    ));
  };

  const handleKeyPress = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length > 1) {
      const newTabs = tabs.filter(tab => tab.id !== tabId);
      setTabs(newTabs);
      if (activeTab === tabId) {
        setActiveTab(newTabs[newTabs.length - 1].id);
      }
    }
  };

  return (
    <div>
      <div className="header-container">
        <div className="tab-container" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleKeyPress(e, () => setActiveTab(tab.id))}
            >
              <span>{tab.tableName || 'New Tab'}</span>
              {tabs.length > 1 && (
                <span
                  className="tab-close"
                  onClick={(e) => closeTab(tab.id, e)}
                  onKeyDown={(e) => handleKeyPress(e, () => closeTab(tab.id, e as any))}
                  role="button"
                  tabIndex={0}
                  aria-label="Close tab"
                >
                  ×
                </span>
              )}
            </button>
          ))}
          <button 
            className="tab"
            onClick={() => addTab()}
            onKeyDown={(e) => handleKeyPress(e, () => addTab())}
            aria-label="Add new tab"
          >
            +
          </button>
        </div>
        <button 
          className="settings-button" 
          onClick={openSettings}
          aria-label="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1-2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>
      
      <div className="content">
        {tabs.map(tab => (
          <div 
            key={tab.id} 
            role="tabpanel"
            aria-hidden={activeTab !== tab.id}
            style={{ display: activeTab === tab.id ? 'block' : 'none' }}
          >
            <TableTab 
              tabId={tab.id}
              tableName={tab.tableName}
              onTableNameChange={(name) => updateTabName(tab.id, name)}
              openNewTab={openNewTab}
              initialFilters={tab.initialFilters} // Pass initialFilters to TableTab
              hasSettings={hasSettings}
            />
          </div>
        ))}
      </div>

      <Settings 
        isOpen={showSettings} 
        onClose={closeSettings}
        onSave={saveSettings}
      />
    </div>
  );
};