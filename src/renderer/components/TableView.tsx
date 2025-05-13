import React, { useState, useRef, useEffect } from 'react';
interface TableViewProps {
  items: any[];
  columnWidths: { [key: string]: number };
  setColumnWidths: (widths: { [key: string]: number }) => void;
  tabId: string;
  addFilter?: (column: string, value: string) => void;
  tables?: string[]; // Add tables prop to show available tables in submenu
  findById?: (tableName: string, idValue: string) => void; // Add function to open a new tab with ID filter
}

export const TableView: React.FC<TableViewProps> = ({
  items,
  columnWidths,
  setColumnWidths,
  tabId,
  addFilter,
  tables = [], // Default to empty array
  findById
}) => {
  const [currentResizer, setCurrentResizer] = useState<{ column: string; startX: number } | null>(null);
  const [activeResizer, setActiveResizer] = useState<string | null>(null); // Track which resizer is hovered
  const tableRef = useRef<HTMLTableElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    column: string;
    value: string;
    showTablesSubmenu?: boolean; // Track whether to show tables submenu
  } | null>(null);

  const extractValue = (attr: any): string => {
    if (!attr) return '';
    if (attr.S !== undefined) return attr.S;
    if (attr.N !== undefined) return attr.N;
    if (attr.BOOL !== undefined) return attr.BOOL.toString();
    if (attr.NULL !== undefined) return 'null';
    if (attr.L !== undefined) return JSON.stringify(attr.L.map(extractValue));
    if (attr.M !== undefined) {
      const obj = Object.entries(attr.M).reduce((acc: any, [key, value]) => {
        acc[key] = extractValue(value);
        return acc;
      }, {});
      return JSON.stringify(obj);
    }
    return JSON.stringify(attr);
  };

  // Calculate optimal position for submenu
  const calculateSubmenuPosition = () => {
    if (!submenuRef.current || !contextMenu) return { left: '100%', right: 'auto' };

    const contextMenuRect = submenuRef.current.parentElement?.getBoundingClientRect();
    if (!contextMenuRect) return { left: '100%', right: 'auto' };

    // Check if there's enough space on either side
    const viewportWidth = window.innerWidth;
    const submenuWidth = 200; // Estimated width, can be adjusted
    const spaceOnRight = viewportWidth - contextMenuRect.right;
    const spaceOnLeft = contextMenuRect.left;
    
    // First try right side (preferred)
    if (spaceOnRight >= submenuWidth + 10) { // Add 10px buffer
      return { left: '100%', right: 'auto' };
    }
    // Then try left side
    if (spaceOnLeft >= submenuWidth + 10) {
      return { left: 'auto', right: '100%' };
    }
    
    // If neither side has enough space, choose the side with more space
    const width = Math.max(150, (spaceOnRight >= spaceOnLeft ? spaceOnRight : spaceOnLeft) - 10);
    return { 
      left: spaceOnRight >= spaceOnLeft ? '100%' : 'auto',
      right: spaceOnRight >= spaceOnLeft ? 'auto' : '100%',
      width: `${width}px`,
      maxWidth: `${width}px`
    };
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close the menu if clicking on the submenu or the Find By ID button
      if (e.target instanceof Element && 
          (e.target.closest('.submenu') || 
           e.target.closest('.find-by-id-btn'))) {
        return;
      }
      setContextMenu(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!currentResizer) return;

      const diff = e.clientX - currentResizer.startX;
      const currentWidth = columnWidths[currentResizer.column] || 150;
      const newWidth = Math.max(50, currentWidth + diff);

      setColumnWidths({
        ...columnWidths,
        [currentResizer.column]: newWidth
      });
      
      // Update the current resizer position
      setCurrentResizer({
        column: currentResizer.column,
        startX: e.clientX
      });
      
      // Visual feedback during resize - add a class to the document body
      document.body.classList.add('resizing-columns');
    };

    const handleMouseUp = () => {
      setCurrentResizer(null);
      // Remove the resizing class
      document.body.classList.remove('resizing-columns');
    };

    if (currentResizer) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [currentResizer, columnWidths, setColumnWidths]);

  const handleResizerMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setCurrentResizer({
      column,
      startX: e.clientX
    });
  };

  const handleResizerMouseEnter = (column: string) => {
    setActiveResizer(column);
  };

  const handleResizerMouseLeave = () => {
    setActiveResizer(null);
  };

  const handleCellDoubleClick = (e: React.MouseEvent<HTMLElement>) => {
    const cell = e.currentTarget;

    document.querySelectorAll('.cell-content.selected').forEach(el =>
      el.classList.remove('selected')
    );

    const range = document.createRange();
    const selection = window.getSelection();

    const textNode = Array.from(cell.childNodes)
      .find(node => node.nodeType === Node.TEXT_NODE);

    if (textNode && selection) {
      const text = textNode.textContent ?? '';
      const start = text.startsWith('"') ? 1 : 0;
      const end = text.endsWith('"') ? text.length - 1 : text.length;

      range.setStart(textNode, start);
      range.setEnd(textNode, end);

      selection.removeAllRanges();
      selection.addRange(range);

      cell.classList.add('selected');
    }
  };

  const handleCellContextMenu = (e: React.MouseEvent<HTMLElement>, column: string, value: string) => {
    e.preventDefault();
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Approximate menu dimensions (you might want to measure actual dimensions)
    const menuWidth = 200;
    const menuHeight = 100;
    
    // Calculate available space
    const spaceOnRight = viewportWidth - e.clientX;
    const spaceOnBottom = viewportHeight - e.clientY;
    
    // Adjust x position if not enough space on right
    let x = e.clientX;
    if (spaceOnRight < menuWidth + 10) { // Add 10px buffer
      x = e.clientX - menuWidth;
    }
    
    // Adjust y position if not enough space at bottom
    let y = e.clientY;
    if (spaceOnBottom < menuHeight + 10) { // Add 10px buffer
      y = e.clientY - menuHeight;
    }
    
    setContextMenu({
      visible: true,
      x,
      y,
      column,
      value,
      showTablesSubmenu: false
    });
  };

  const handleFilterClick = () => {
    if (contextMenu && addFilter) {
      addFilter(contextMenu.column, contextMenu.value);
      setContextMenu(null);
    }
  };

  const handleCopyClick = () => {
    if (contextMenu) {
      navigator.clipboard.writeText(contextMenu.value);
      setContextMenu(null);
    }
  };

  const handleFindByIdClick = (e: React.MouseEvent) => {
    // Prevent event propagation to avoid menu closing
    e.stopPropagation();
    
    if (contextMenu) {
      // Always show the submenu when Find By ID is clicked
      setContextMenu({
        ...contextMenu,
        showTablesSubmenu: true
      });
    }
  };

  const handleTableSelect = (tableName: string) => {
    if (contextMenu && findById) {
      findById(tableName, contextMenu.value);
      setContextMenu(null);
    }
  };

  if (items.length === 0) return null;

  const columns = Array.from(
    new Set(items.flatMap(item => Object.keys(item)))
  );

  // Get submenu position (left or right)
  const submenuPosition = calculateSubmenuPosition();

  return (
    <div className="table-container">
      <table ref={tableRef}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col}
                style={{ width: columnWidths[col] || 150 }}
                title={`${col} - Click and drag the right edge to resize this column`}
              >
                {col}
                <div
                  role="button"
                  aria-orientation="vertical"
                  aria-label={`Resize ${col} column`}
                  className={`resizer ${activeResizer === col ? 'active-resizer' : ''}`}
                  onMouseDown={(e) => handleResizerMouseDown(e, col)}
                  onMouseEnter={() => handleResizerMouseEnter(col)}
                  onMouseLeave={handleResizerMouseLeave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleResizerMouseDown(e as unknown as React.MouseEvent, col);
                    }
                  }}
                >
                  {/* Add a visual handle indicator */}
                  <div className="resizer-handle"></div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={`${tabId}-${idx}-${Object.values(item).join('-')}`}>
              {columns.map(col => {
                const cellValue = extractValue(item[col]);
                return (
                  <td
                    key={col}
                    onDoubleClick={handleCellDoubleClick}
                    onContextMenu={(e) => handleCellContextMenu(e, col, cellValue)}
                    className="cell-content"
                    style={{ width: columnWidths[col] || 150 }}
                  >
                    {cellValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {contextMenu && contextMenu.visible && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000
          }}
        >
          <button onClick={handleFilterClick}>
            Filter: {contextMenu.column} = {contextMenu.value}
          </button>
          <button onClick={handleCopyClick}>
            Copy
          </button>
          {findById && (
            <button 
              onClick={handleFindByIdClick}
              className="find-by-id-btn" // Add class for click handler targeting
            >
              Find By ID
            </button>
          )}

          {/* Tables submenu - improved positioning and scrolling */}
          {contextMenu.showTablesSubmenu && tables.length > 0 && (
            <div 
              ref={submenuRef}
              className="context-menu submenu"
              style={{
                position: 'absolute',
                top: '0',
                left: submenuPosition.left,
                right: submenuPosition.right,
                zIndex: 1001,
                maxHeight: '300px', // Limit height and add scrolling
                overflowY: 'auto', // Enable vertical scrolling
                minWidth: '200px',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)'
              }}
            >
              {tables.map(tableName => (
                <button 
                  key={tableName} 
                  onClick={() => handleTableSelect(tableName)}
                  style={{
                    padding: '8px 16px',
                    textAlign: 'left',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tableName}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};