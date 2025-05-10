import React, { useState, useEffect } from 'react';
import { FilterSection, type FilterExpression } from './components/FilterSection';
import { TableView } from './components/TableView';
import { AWSDynamoDBService } from './services/AWSDynamoDBService';
import type { DynamoDBService, KeySchemaInfo } from './services/DynamoDBService';

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
  operationType: 'scan' | 'query';
  selectedIndex: string | null;
  partitionKeyValue: string;
  sortKeyValue: string;
  sortKeyOperator: string;
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
  
  // New state for query functionality
  const [operationType, setOperationType] = useState<'scan' | 'query'>('scan');
  const [tableKeySchema, setTableKeySchema] = useState<KeySchemaInfo | null>(null);
  const [loadingKeySchema, setLoadingKeySchema] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null);
  const [partitionKeyValue, setPartitionKeyValue] = useState<string>('');
  const [sortKeyValue, setSortKeyValue] = useState<string>('');
  const [sortKeyOperator, setSortKeyOperator] = useState<string>('=');

  // Create DynamoDB service using localStorage values instead of env vars
  const dynamoService: DynamoDBService = new AWSDynamoDBService({
    region: 'ap-southeast-2',
    credentials: {
      accessKeyId: localStorage.getItem('DDBV_KEY_ID') ?? '',
      secretAccessKey: localStorage.getItem('DDBV_ACC_KEY') ?? '',
    }
  });

  useEffect(() => {
    // We don't need to show an alert here anymore, as we'll show the settings dialog instead
    // when hasSettings is false
  }, []);

  useEffect(() => {
    const savedState = localStorage.getItem(`tab-${tabId}`);
    if (savedState) {
      try {
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
        if (state.operationType) {
          setOperationType(state.operationType);
        }
        if (state.selectedIndex) {
          setSelectedIndex(state.selectedIndex);
        }
        if (state.partitionKeyValue) {
          setPartitionKeyValue(state.partitionKeyValue);
        }
        if (state.sortKeyValue) {
          setSortKeyValue(state.sortKeyValue);
        }
        if (state.sortKeyOperator) {
          setSortKeyOperator(state.sortKeyOperator);
        }
      } catch (error) {
        console.error('Error loading saved tab state:', error);
      }
    }
  }, [tabId, initialFilters.length]);

  useEffect(() => {
    const state: TabState = {
      tableName,
      filters,
      columnWidths,
      itemsPerPage,
      operationType,
      selectedIndex,
      partitionKeyValue,
      sortKeyValue,
      sortKeyOperator
    };
    localStorage.setItem(`tab-${tabId}`, JSON.stringify(state));
  }, [tabId, tableName, filters, columnWidths, itemsPerPage, operationType, selectedIndex, partitionKeyValue, sortKeyValue, sortKeyOperator]);

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
      fetchTableKeySchema();
    } else {
      // Reset properties if no table is selected
      setSampleItemProperties([]);
      setTableKeySchema(null);
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

  const fetchTableKeySchema = async () => {
    if (!tableName) return;
    
    setLoadingKeySchema(true);
    try {
      const keySchema = await dynamoService.getTableKeySchema(tableName);
      setTableKeySchema(keySchema);
    } catch (error) {
      console.error('Error fetching table key schema:', error);
      setTableKeySchema(null);
    } finally {
      setLoadingKeySchema(false);
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
      let results;
      
      if (operationType === 'scan') {
        // Execute a scan operation
        results = await dynamoService.scanTable(tableName, filters, {
          limit: itemsPerPage,
          startKey
        });
      } else {
        // Execute a query operation
        if (!selectedIndex || !partitionKeyValue) {
          throw new Error('Partition key is required for query operations');
        }
        
        const actualIndexName = selectedIndex === 'Primary Key' ? null : selectedIndex;
        
        // Get partition key name and sort key name from selected index
        let partitionKeyName = tableKeySchema?.keySchema.partitionKey ?? '';
        let sortKeyName: string | undefined;
        
        if (actualIndexName && tableKeySchema?.indexes?.[actualIndexName]) {
          partitionKeyName = tableKeySchema.indexes[actualIndexName].partitionKey ?? '';
          sortKeyName = tableKeySchema.indexes[actualIndexName].sortKey;
        } else {
          sortKeyName = tableKeySchema?.keySchema.sortKey;
        }
        
        results = await dynamoService.queryTable(
          tableName,
          actualIndexName,
          { name: partitionKeyName, value: partitionKeyValue },
          sortKeyName && sortKeyValue ? 
            { name: sortKeyName, value: sortKeyValue, operator: sortKeyOperator } : 
            null,
          filters,
          {
            limit: itemsPerPage,
            startKey
          }
        );
      }
      
      setItems(results.items);
      setLastEvaluatedKey(results.lastEvaluatedKey);
      
      if (isNewQuery) {
        setPageHistory([startKey]);
        setCurrentPageIndex(0);
      }
    } catch (error) {
      console.error('Error executing DynamoDB operation:', error);
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
  
  const handleOperationTypeChange = (type: 'scan' | 'query') => {
    setOperationType(type);
    // Reset pagination when changing operation type
    setLastEvaluatedKey(undefined);
    setPageHistory([]);
    setCurrentPageIndex(-1);
  };
  
  const handleTableNameChange = (name: string) => {
    onTableNameChange(name);
    // Reset the lastEvaluatedKey and query parameters when changing tables
    setLastEvaluatedKey(undefined);
    setPageHistory([]);
    setCurrentPageIndex(-1);
    setSelectedIndex(null);
    setPartitionKeyValue('');
    setSortKeyValue('');
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
        onTableNameChange={handleTableNameChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        hasNextPage={!!lastEvaluatedKey}
        hasPreviousPage={currentPageIndex > 0}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        sampleItemProperties={sampleItemProperties}
        loadingProperties={loadingProperties}
        // Pass query related props
        operationType={operationType}
        setOperationType={handleOperationTypeChange}
        tableKeySchema={tableKeySchema}
        loadingKeySchema={loadingKeySchema}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        partitionKeyValue={partitionKeyValue}
        setPartitionKeyValue={setPartitionKeyValue}
        sortKeyValue={sortKeyValue}
        setSortKeyValue={setSortKeyValue}
        sortKeyOperator={sortKeyOperator}
        setSortKeyOperator={setSortKeyOperator}
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