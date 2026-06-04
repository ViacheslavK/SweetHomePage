import { useState, useEffect } from 'react';
import { 
  Settings, 
  AlertTriangle, 
  Bookmark, 
  FileText, 
  ChevronDown, 
  Sparkles,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { SearchBar } from './components/SearchBar.jsx';
import { BookmarkWidget } from './components/BookmarkWidget.jsx';
import { NoteWidget } from './components/NoteWidget.jsx';
import { SettingsModal } from './components/SettingsModal.jsx';
import { BrokenLinksModal } from './components/BrokenLinksModal.jsx';
import type { GlobalSettings, PageConfig, Widget } from '@startme/shared';

function App() {
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [pageConfig, setPageConfig] = useState<PageConfig | null>(null);
  
  // Modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBrokenLinksOpen, setIsBrokenLinksOpen] = useState(false);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  
  // Broken links alert state (number of alerts)
  const [brokenLinksCount, setBrokenLinksCount] = useState(0);

  // Drag and Drop layout states
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<number | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [dragOverWidgetSide, setDragOverWidgetSide] = useState<'top' | 'bottom' | null>(null);

  // Fetch Global Settings
  const loadGlobalSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setGlobalSettings(data);
      }
    } catch (error) {
      console.error('Failed to load global settings:', error);
    }
  };

  // Fetch Page Configuration
  const loadPageConfig = async (pageId: string) => {
    try {
      const response = await fetch(`/api/pages/${pageId}`);
      if (response.ok) {
        const data = await response.json();
        setPageConfig(data);
      }
    } catch (error) {
      console.error(`Failed to load page ${pageId}:`, error);
    }
  };

  // Fetch count of broken links
  const loadBrokenLinksCount = async () => {
    try {
      const response = await fetch('/api/checker/results');
      if (response.ok) {
        const data = await response.json();
        const results = data.results || [];
        setBrokenLinksCount(results.length);
      }
    } catch (error) {
      console.error('Failed to load broken links count:', error);
    }
  };

  // Initial load
  useEffect(() => {
    loadGlobalSettings();
    loadBrokenLinksCount();
  }, []);

  // Theme application
  useEffect(() => {
    if (!globalSettings) return;
    const bodyClass = document.body.classList;
    if (globalSettings.globalTheme === 'light-glass') {
      bodyClass.add('theme-light-glass');
    } else {
      bodyClass.remove('theme-light-glass');
    }
  }, [globalSettings]);

  // Load configuration for active page
  useEffect(() => {
    if (globalSettings && globalSettings.activePageId) {
      loadPageConfig(globalSettings.activePageId);
    } else {
      setPageConfig(null);
    }
  }, [globalSettings?.activePageId]);

  // Update browser tab title dynamically
  useEffect(() => {
    if (pageConfig && pageConfig.title) {
      document.title = `SweetHomePage - ${pageConfig.title}`;
    } else {
      document.title = 'SweetHomePage';
    }
  }, [pageConfig?.title]);

  const handleSelectPage = async (pageId: string) => {
    if (!globalSettings) return;
    
    // 1. Optimistic activePageId update
    const updatedSettings = {
      ...globalSettings,
      activePageId: pageId
    };
    setGlobalSettings(updatedSettings);
    setIsPageDropdownOpen(false);

    // 2. Persist to API
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
    } catch (error) {
      console.error('Failed to save selected page state:', error);
    }
  };

  const handleSaveWidgetData = async (widgetId: string, widgetData: any) => {
    if (!pageConfig) return;

    const updatedWidgets = pageConfig.widgets.map(w => {
      if (w.id === widgetId) {
        return {
          ...w,
          data: {
            ...w.data,
            ...widgetData
          }
        };
      }
      return w;
    });

    const updatedConfig = {
      ...pageConfig,
      widgets: updatedWidgets
    };

    // Update state locally
    setPageConfig(updatedConfig);

    // Save to API
    try {
      await fetch(`/api/pages/${pageConfig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
    } catch (error) {
      console.error('Failed to save widget change:', error);
    }
  };

  // Drag and Drop layout handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedWidgetId(id);
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverCol(null);
    setDragOverWidgetId(null);
    setDragOverWidgetSide(null);
  };

  const handleDragOverCol = (e: React.DragEvent, colIndex: number) => {
    e.preventDefault();
    if (dragOverCol !== colIndex) {
      setDragOverCol(colIndex);
    }
  };

  const handleDragOverWidget = (e: React.DragEvent, widgetId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Stop column drag over from taking over
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const isTop = relativeY < rect.height / 2;
    const side = isTop ? 'top' : 'bottom';
    
    if (dragOverWidgetId !== widgetId || dragOverWidgetSide !== side) {
      setDragOverWidgetId(widgetId);
      setDragOverWidgetSide(side);
    }
  };

  const handleDragLeaveWidget = () => {
    setDragOverWidgetId(null);
    setDragOverWidgetSide(null);
  };

  const handleDropOnCol = async (e: React.DragEvent, targetCol: number) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData('text/plain') || draggedWidgetId;
    if (!id || !pageConfig) return;

    // Filter widgets by target column and find max row to append at the end
    const colWidgets = pageConfig.widgets.filter(
      w => (w.position?.col ?? 0) === targetCol && w.id !== id
    );
    const maxRow = colWidgets.reduce((max, w) => Math.max(max, w.position?.row ?? 0), -1);

    const updatedWidgets = pageConfig.widgets.map(w => {
      if (w.id === id) {
        return {
          ...w,
          position: {
            ...w.position,
            col: targetCol,
            row: maxRow + 1
          }
        };
      }
      return w;
    });

    const updatedConfig = {
      ...pageConfig,
      widgets: updatedWidgets
    };

    setPageConfig(updatedConfig);
    setDraggedWidgetId(null);

    // Save to backend
    try {
      await fetch(`/api/pages/${pageConfig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
    } catch (err) {
      console.error('Failed to save drag drop col change:', err);
    }
  };

  const handleDropOnWidget = async (e: React.DragEvent, targetWidgetId: string, targetCol: number) => {
    e.preventDefault();
    e.stopPropagation(); // Stop bubbling up to the column container
    setDragOverCol(null);
    setDragOverWidgetId(null);
    setDragOverWidgetSide(null);
    const id = e.dataTransfer.getData('text/plain') || draggedWidgetId;
    if (!id || id === targetWidgetId || !pageConfig) return;

    const targetWidget = pageConfig.widgets.find(w => w.id === targetWidgetId);
    if (!targetWidget) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const isTopHalf = relativeY < rect.height / 2;

    const otherWidgets = pageConfig.widgets.filter(w => w.id !== id);
    const targetColWidgets = otherWidgets.filter(w => (w.position?.col ?? 0) === targetCol);
    targetColWidgets.sort((a, b) => (a.position?.row ?? 0) - (b.position?.row ?? 0));

    let targetIdx = targetColWidgets.findIndex(w => w.id === targetWidgetId);
    if (targetIdx === -1) {
      targetIdx = targetColWidgets.length;
    } else if (!isTopHalf) {
      targetIdx = targetIdx + 1; // Insert after the target widget
    }

    const draggedWidget = pageConfig.widgets.find(w => w.id === id);
    if (!draggedWidget) return;

    const newDraggedWidget = {
      ...draggedWidget,
      position: {
        ...draggedWidget.position,
        col: targetCol
      }
    };

    // Insert at index Y-adjusted position
    targetColWidgets.splice(targetIdx, 0, newDraggedWidget);

    // Re-index rows
    targetColWidgets.forEach((w, idx) => {
      w.position = {
        ...w.position,
        row: idx
      };
    });

    // Re-assemble
    const updatedWidgets = pageConfig.widgets.map(w => {
      const updatedInCol = targetColWidgets.find(tc => tc.id === w.id);
      if (updatedInCol) return updatedInCol;
      if (w.id === id) return newDraggedWidget;
      return w;
    });

    const updatedConfig = {
      ...pageConfig,
      widgets: updatedWidgets
    };

    setPageConfig(updatedConfig);
    setDraggedWidgetId(null);

    // Save to backend
    try {
      await fetch(`/api/pages/${pageConfig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
    } catch (err) {
      console.error('Failed to save drag drop widget change:', err);
    }
  };

  const handleAddWidget = async (type: 'bookmarks' | 'notes') => {
    if (!pageConfig) return;

    // Find column with the fewest widgets to keep layout balanced at creation
    let minCol = 0;
    let minCount = Infinity;
    const numColumns = pageConfig.settings?.columns || 3;
    for (let c = 0; c < numColumns; c++) {
      const count = pageConfig.widgets.filter(w => (w.position?.col ?? 0) === c).length;
      if (count < minCount) {
        minCount = count;
        minCol = c;
      }
    }

    const colWidgets = pageConfig.widgets.filter(w => (w.position?.col ?? 0) === minCol);
    const maxRow = colWidgets.reduce((max, w) => Math.max(max, w.position?.row ?? 0), -1);
    const newRow = maxRow + 1;

    const widgetTitle = type === 'bookmarks' ? 'Bookmarks Panel' : 'Notes notepad';
    const newWidget: Widget = {
      id: 'widget-' + Math.random().toString(36).substring(2, 9),
      type,
      title: widgetTitle,
      position: { col: minCol, row: newRow, colSpan: 1, rowSpan: 1 },
      data: type === 'bookmarks' ? { items: [] } : { content: '' }
    };

    const updatedConfig = {
      ...pageConfig,
      widgets: [...pageConfig.widgets, newWidget]
    };

    setPageConfig(updatedConfig);

    try {
      await fetch(`/api/pages/${pageConfig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
    } catch (error) {
      console.error('Failed to add widget:', error);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!pageConfig || !window.confirm('Are you sure you want to delete this widget?')) return;

    const updatedConfig = {
      ...pageConfig,
      widgets: pageConfig.widgets.filter(w => w.id !== widgetId)
    };

    setPageConfig(updatedConfig);

    try {
      await fetch(`/api/pages/${pageConfig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
    } catch (error) {
      console.error('Failed to delete widget:', error);
    }
  };

  const handleUpdateWidgetTitle = async (widgetId: string, currentTitle: string) => {
    const newTitle = window.prompt('Enter new widget title:', currentTitle);
    if (newTitle === null || !newTitle.trim()) return;

    if (!pageConfig) return;

    const updatedConfig = {
      ...pageConfig,
      widgets: pageConfig.widgets.map(w => w.id === widgetId ? { ...w, title: newTitle.trim() } : w)
    };

    setPageConfig(updatedConfig);

    try {
      await fetch(`/api/pages/${pageConfig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
    } catch (error) {
      console.error('Failed to update widget title:', error);
    }
  };

  return (
    <div className="app-container">
      {/* Header Panel */}
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
            <Sparkles size={20} />
            SweetHomePage
          </div>

          {/* Switcher Dropdown */}
          {globalSettings && (
            <div className="dropdown-container">
              <button 
                className="dropdown-trigger" 
                onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
              >
                <span>{globalSettings.pagesList.find(p => p.id === globalSettings.activePageId)?.title || 'Select Dashboard'}</span>
                <ChevronDown size={14} />
              </button>
              {isPageDropdownOpen && (
                <ul className="dropdown-menu">
                  {globalSettings.pagesList.map(page => (
                    <li 
                      key={page.id} 
                      className={`dropdown-item ${globalSettings.activePageId === page.id ? 'active' : ''}`}
                      onClick={() => handleSelectPage(page.id)}
                    >
                      {page.title}
                    </li>
                  ))}
                  <li 
                    className="dropdown-item" 
                    style={{ borderTop: '1px solid var(--border-glass)', marginTop: '4px', color: 'var(--accent-color)', fontWeight: 600 }}
                    onClick={() => {
                      setIsPageDropdownOpen(false);
                      setIsSettingsOpen(true);
                    }}
                  >
                    + Manage Dashboards
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Global Search Bar */}
        <SearchBar onNavigateToPage={handleSelectPage} />

        <div className="header-right">
          {/* Health checker status bar */}
          <button 
            className="btn btn-secondary" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              borderColor: brokenLinksCount > 0 ? 'var(--warning-color)' : 'var(--border-glass)'
            }}
            onClick={() => setIsBrokenLinksOpen(true)}
          >
            <AlertTriangle 
              size={16} 
              style={{ color: brokenLinksCount > 0 ? 'var(--warning-color)' : 'var(--text-secondary)' }} 
            />
            <span>Link Health</span>
            {brokenLinksCount > 0 && (
              <span 
                style={{ 
                  background: 'var(--danger-color)', 
                  color: '#fff', 
                  borderRadius: '10px', 
                  padding: '1px 6px', 
                  fontSize: '0.7rem', 
                  fontWeight: 700 
                }}
              >
                {brokenLinksCount}
              </span>
            )}
          </button>

          <button className="btn-icon" onClick={() => setIsSettingsOpen(true)} title="Global App settings">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Workspace Grid */}
      <main className="workspace-container">
        {pageConfig ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 700 }}>
                  {pageConfig.title}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Docker Host Volume Dashboard &rsaquo; Local Configurations File
                </p>
              </div>

              {/* Add widgets panels */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={() => handleAddWidget('bookmarks')}>
                  <Bookmark size={16} /> + Bookmarks
                </button>
                <button className="btn btn-secondary" onClick={() => handleAddWidget('notes')}>
                  <FileText size={16} /> + Notes Notepad
                </button>
              </div>
            </div>

            {/* Widget layout grids */}
            {pageConfig.widgets.length === 0 ? (
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '5rem 2rem', 
                  textAlign: 'center', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--text-muted)' 
                }}
              >
                <Sparkles size={36} style={{ color: 'var(--accent-color)' }} />
                <h3>Your Start Page is Empty</h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '400px' }}>
                  Click "+ Bookmarks" or "+ Notes Notepad" above to create grids and link panels.
                </p>
              </div>
            ) : (
              <div className="widgets-grid" style={{ gridTemplateColumns: `repeat(${pageConfig.settings?.columns || 3}, 1fr)` }}>
                {Array.from({ length: pageConfig.settings?.columns || 3 }).map((_, colIndex) => {
                  const numColumns = pageConfig.settings?.columns || 3;
                  const colWidgets = pageConfig.widgets.filter(
                    w => {
                      const col = w.position?.col ?? 0;
                      if (colIndex === numColumns - 1) {
                        return col >= colIndex;
                      }
                      return col === colIndex;
                    }
                  );
                  colWidgets.sort((a, b) => (a.position?.row ?? 0) - (b.position?.row ?? 0));

                  return (
                    <div 
                      key={colIndex} 
                      className={`widgets-column ${dragOverCol === colIndex ? 'drag-over' : ''}`}
                      onDragOver={(e) => handleDragOverCol(e, colIndex)}
                      onDragLeave={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropOnCol(e, colIndex)}
                      style={{
                        minHeight: '450px',
                        borderRadius: 'var(--radius-md)',
                        transition: 'background var(--transition-fast), border-color var(--transition-fast)',
                        border: dragOverCol === colIndex ? '2px dashed var(--border-focus)' : '2px dashed transparent',
                        background: dragOverCol === colIndex ? 'rgba(118, 102, 240, 0.05)' : 'transparent',
                        padding: '4px'
                      }}
                    >
                      {colWidgets.map(widget => (
                        <div 
                          key={widget.id} 
                          className="glass-panel widget-card animate-fade-in"
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, widget.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOverWidget(e, widget.id)}
                          onDragLeave={handleDragLeaveWidget}
                          onDrop={(e) => {
                            handleDragLeaveWidget();
                            handleDropOnWidget(e, widget.id, colIndex);
                          }}
                          style={{
                            borderTop: (dragOverWidgetId === widget.id && dragOverWidgetSide === 'top') ? '2px solid var(--border-focus)' : undefined,
                            borderBottom: (dragOverWidgetId === widget.id && dragOverWidgetSide === 'bottom') ? '2px solid var(--border-focus)' : undefined,
                            transition: 'border var(--transition-fast)'
                          }}
                        >
                          <div className="widget-header">
                            <div 
                              className="widget-title" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleUpdateWidgetTitle(widget.id, widget.title)}
                              title="Click to rename"
                            >
                              {widget.type === 'bookmarks' ? <Bookmark size={15} style={{ color: 'var(--accent-color)' }} /> : <FileText size={15} style={{ color: 'var(--accent-color)' }} />}
                              <span>{widget.title}</span>
                            </div>
                            <button 
                              className="btn-icon" 
                              style={{ color: 'var(--danger-color)' }}
                              onClick={() => handleDeleteWidget(widget.id)}
                              title="Delete Panel"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="widget-body">
                            {widget.type === 'bookmarks' ? (
                              <BookmarkWidget 
                                widget={widget} 
                                pageId={pageConfig.id} 
                                onSaveWidgetData={handleSaveWidgetData} 
                              />
                            ) : (
                              <NoteWidget 
                                widget={widget} 
                                onSaveWidgetData={handleSaveWidgetData} 
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <RefreshCw size={36} className="animate-spin" style={{ animation: 'spin 2s linear infinite', marginBottom: '10px' }} />
              <p>Loading Active Dashboard Configuration...</p>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal component */}
      {globalSettings && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          globalSettings={globalSettings}
          activePageId={globalSettings.activePageId}
          onRefreshSettings={loadGlobalSettings}
          onSelectPage={handleSelectPage}
        />
      )}

      {/* Diagnostics health checker modal */}
      <BrokenLinksModal
        isOpen={isBrokenLinksOpen}
        onClose={() => {
          setIsBrokenLinksOpen(false);
          loadBrokenLinksCount(); // Update alert count
        }}
        onRefreshPageData={() => {
          if (globalSettings?.activePageId) {
            loadPageConfig(globalSettings.activePageId);
          }
        }}
      />
    </div>
  );
}

export default App;
