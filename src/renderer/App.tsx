import React, { useState } from 'react';
import { TableTab } from './TableTab';
import { FilterExpression } from './components/FilterSection';

interface Tab {
  id: string;
  tableName: string;
  initialFilters?: FilterExpression[]; // Add initialFilters for new tabs
}

export const App: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([{ id: '1', tableName: '' }]);
  const [activeTab, setActiveTab] = useState('1');

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
            />
          </div>
        ))}
      </div>
    </div>
  );
};