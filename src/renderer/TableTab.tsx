import React, { useState, useEffect } from 'react';
import { FilterSection, type FilterExpression } from './components/FilterSection';
import { TableView } from './components/TableView';
import { AWSDynamoDBService } from './services/AWSDynamoDBService';
import type { DynamoDBService } from './services/DynamoDBService';

interface TableTabProps {
  tabId: string;
  tableName: string;
  onTableNameChange: (name: string) => void;
  openNewTab?: (tableName: string, filters: FilterExpression[]) => void;
  initialFilters?: FilterExpression[]; // Add initialFilters prop
  hasSettings?: boolean; // Add hasSettings prop
}

interface TabState {
  tableName: string;
  filters: FilterExpression[];
  columnWidths: { [key: string]: number };
  itemsPerPage: number;
}

export const TableTab: React.FC<TableTabProps> = ({ 
  tabId, 
  tableName, 
  onTableNameChange, 
  openNewTab,
  initialFilters = [], // Default to empty array
  hasSettings = false
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  // Initialize filters with initialFilters if provided
  const [filters, setFilters] = useState<FilterExpression[]>(initialFilters);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<any>(undefined);
  const [pageHistory, setPageHistory] = useState<any[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(-1);
  // Add state for sample item properties
  const [sampleItemProperties, setSampleItemProperties] = useState<string[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  // Create DynamoDB service using localStorage values instead of env vars
  const dynamoService: DynamoDBService = new AWSDynamoDBService({
    region: 'ap-southeast-2',
    credentials: {
      accessKeyId: localStorage.getItem('DDBV_KEY_ID') || '',
      secretAccessKey: localStorage.getItem('DDBV_ACC_KEY') || '',
    }
  });

  useEffect(() => {
    // We don't need to show an alert here anymore, as we'll show the settings dialog instead
    // when hasSettings is false
  }, []);

  useEffect(() => {
    const savedState = localStorage.getItem(`tab-${tabId}`);
    if (savedState) {
      const state: TabState = JSON.parse(savedState);
      if (state.tableName) {
        onTableNameChange(state.tableName);
      }
      // Only load filters from local storage if no initialFilters were provided
      if (state.filters && initialFilters.length === 0) {
        setFilters(state.filters);
      }
      if (state.columnWidths) {
        setColumnWidths(state.columnWidths);
      }
      if (state.itemsPerPage) {
        setItemsPerPage(state.itemsPerPage);
      }
    }
  }, [tabId, initialFilters.length]);

  useEffect(() => {
    const state: TabState = {
      tableName,
      filters,
      columnWidths,
      itemsPerPage
    };
    localStorage.setItem(`tab-${tabId}`, JSON.stringify(state));
  }, [tabId, tableName, filters, columnWidths, itemsPerPage]);

  useEffect(() => {
    // Only fetch tables if we have settings
    if (hasSettings) {
      fetchTables();
    }
  }, [hasSettings]);

  useEffect(() => {
    // Fetch a sample item when the table changes
    if (tableName && hasSettings) {
      fetchSampleItem();
    } else {
      // Reset properties if no table is selected
      setSampleItemProperties([]);
    }
  }, [tableName, hasSettings]);

  const fetchSampleItem = async () => {
    if (!tableName) return;
    
    setLoadingProperties(true);
    try {
      const sampleItem = await dynamoService.fetchSampleItem(tableName);
      
      if (sampleItem) {
        // Extract property names from the sample item
        const properties = Object.keys(sampleItem);
        setSampleItemProperties(properties);
      } else {
        setSampleItemProperties([]);
      }
    } catch (error) {
      console.error('Error fetching sample item:', error);
      setSampleItemProperties([]);
    } finally {
      setLoadingProperties(false);
    }
  };

  const fetchTables = async () => {
    try {
      setLoadingTables(true);
      const tableList = await dynamoService.listTables();
      setTables(tableList);
      if (!tableName && tableList.length > 0) {
        onTableNameChange(tableList[0]);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    if (tableName && initialFilters.length > 0 && hasSettings) {
      executeQuery();
    }
  }, [tableName, JSON.stringify(initialFilters), hasSettings]);

  const executeQuery = async (startKey?: any, isNewQuery = true) => {
    if (!tableName || !hasSettings) return;

    setLoading(true);
    try {
      const results = await dynamoService.queryTable(tableName, filters, {
        limit: itemsPerPage,
        startKey
      });
      setItems(results.items);
      setLastEvaluatedKey(results.lastEvaluatedKey);
      
      if (isNewQuery) {
        setPageHistory([startKey]);
        setCurrentPageIndex(0);
      }
    } catch (error) {
      console.error('Error querying DynamoDB:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (lastEvaluatedKey) {
      const newHistory = pageHistory.slice(0, currentPageIndex + 1);
      newHistory.push(lastEvaluatedKey);
      setPageHistory(newHistory);
      setCurrentPageIndex(currentPageIndex + 1);
      executeQuery(lastEvaluatedKey, false);
    }
  };

  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      const newIndex = currentPageIndex - 1;
      setCurrentPageIndex(newIndex);
      executeQuery(pageHistory[newIndex], false);
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setLastEvaluatedKey(undefined);
    setPageHistory([]);
    setCurrentPageIndex(-1);
    executeQuery();
  };

  const handleAddFilter = (column: string, value: string) => {
    const newFilter: FilterExpression = {
      id: Date.now().toString(),
      attributeName: column,
      operator: '=',
      value: value
    };
    
    setFilters([...filters, newFilter]);
  };

  const handleFindById = (selectedTableName: string, idValue: string) => {
    if (!openNewTab) return;

    const idFilter: FilterExpression = {
      id: Date.now().toString(),
      attributeName: 'id',
      operator: '=',
      value: idValue
    };

    openNewTab(selectedTableName, [idFilter]);
  };

  return (
    <div>
      <FilterSection
        filters={filters}
        setFilters={setFilters}
        onExecuteQuery={() => executeQuery()}
        loading={loading}
        tableName={tableName}
        tables={tables}
        loadingTables={loadingTables}
        onTableNameChange={(name) => {
          onTableNameChange(name);
          // Reset the lastEvaluatedKey when changing tables
          setLastEvaluatedKey(undefined);
          setPageHistory([]);
          setCurrentPageIndex(-1);
        }}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        hasNextPage={!!lastEvaluatedKey}
        hasPreviousPage={currentPageIndex > 0}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        sampleItemProperties={sampleItemProperties}
        loadingProperties={loadingProperties}
      />
      <TableView
        items={items}
        columnWidths={columnWidths}
        setColumnWidths={setColumnWidths}
        tabId={tabId}
        addFilter={handleAddFilter}
        tables={tables}
        findById={handleFindById}
      />
    </div>
  );
};