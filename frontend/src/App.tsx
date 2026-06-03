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

  const handleAddWidget = async (type: 'bookmarks' | 'notes') => {
    if (!pageConfig) return;

    const widgetTitle = type === 'bookmarks' ? 'Bookmarks Panel' : 'Notes notepad';
    const newWidget: Widget = {
      id: 'widget-' + Math.random().toString(36).substring(2, 9),
      type,
      title: widgetTitle,
      position: { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
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
            StartMeDocker
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
              <div className="widgets-grid">
                {pageConfig.widgets.map(widget => (
                  <div key={widget.id} className="glass-panel widget-card animate-fade-in">
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
