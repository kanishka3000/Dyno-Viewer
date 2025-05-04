import React, { useState, useEffect } from 'react';
import { FilterSection, type FilterExpression } from './components/FilterSection';
import { TableView } from './components/TableView';
import { AWSDynamoDBService } from './services/AWSDynamoDBService';
import type { DynamoDBService } from './services/DynamoDBService';

interface TableTabProps {
  tabId: string;
  tableName: string;
  onTableNameChange: (name: string) => void;
}

interface TabState {
  tableName: string;
  filters: FilterExpression[];
  columnWidths: { [key: string]: number };
  itemsPerPage: number;
}

export const TableTab: React.FC<TableTabProps> = ({ tabId, tableName, onTableNameChange }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [filters, setFilters] = useState<FilterExpression[]>([]);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<any>(undefined);
  const [pageHistory, setPageHistory] = useState<any[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(-1);

  const dynamoService: DynamoDBService = new AWSDynamoDBService({
    region: 'ap-southeast-2',
    credentials: {
      accessKeyId: process.env.DDBV_KEY_ID ?? '',
      secretAccessKey: process.env.DDBV_ACC_KEY ?? '',
    }
  });

  useEffect(() => {
    if (!dynamoService.checkCredentials()) {
      const missingVars = ['DDBV_KEY_ID', 'DDBV_ACC_KEY', 'DDBV_STACK']
        .filter(key => !process.env[key])
        .map(v => 'export ' + v + '=<value>')
        .join('\n');
      alert('The following environment variables need to be set:\n' + missingVars);
    }
  }, []);

  useEffect(() => {
    const savedState = localStorage.getItem(`tab-${tabId}`);
    if (savedState) {
      const state: TabState = JSON.parse(savedState);
      if (state.tableName) {
        onTableNameChange(state.tableName);
      }
      if (state.filters) {
        setFilters(state.filters);
      }
      if (state.columnWidths) {
        setColumnWidths(state.columnWidths);
      }
      if (state.itemsPerPage) {
        setItemsPerPage(state.itemsPerPage);
      }
    }
  }, [tabId]);

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
    const fetchTables = async () => {
      try {
        const tableList = await dynamoService.listTables();
        setTables(tableList);
        if (!tableName && tableList.length > 0) {
          onTableNameChange(tableList[0]);
        }
      } catch (error) {
        alert(`Error fetching tables: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoadingTables(false);
      }
    };

    fetchTables();
  }, []);

  const executeQuery = async (startKey?: any, isNewQuery = true) => {
    if (!tableName) return;

    setLoading(true);
    try {
      const results = await dynamoService.queryTable(tableName, filters, {
        limit: itemsPerPage,
        startKey
      });
      setItems(results.items);
      setLastEvaluatedKey(results.lastEvaluatedKey);
      
      if (isNewQuery) {
        // Reset pagination state for new queries
        setPageHistory([startKey]);
        setCurrentPageIndex(0);
      }
    } catch (error) {
      alert(`Error querying DynamoDB: ${error instanceof Error ? error.message : String(error)}`);
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
        onTableNameChange={onTableNameChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        hasNextPage={!!lastEvaluatedKey}
        hasPreviousPage={currentPageIndex > 0}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
      />
      <TableView
        items={items}
        columnWidths={columnWidths}
        setColumnWidths={setColumnWidths}
        tabId={tabId}
      />
    </div>
  );
};