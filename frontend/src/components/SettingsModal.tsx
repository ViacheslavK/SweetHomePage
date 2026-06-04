import React, { useState } from 'react';
import { X, Plus, Trash2, Download, Upload, Monitor } from 'lucide-react';
import type { GlobalSettings, PageConfig } from '@startme/shared';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  globalSettings: GlobalSettings;
  activePageId: string | null;
  onRefreshSettings: () => void;
  onSelectPage: (pageId: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  globalSettings,
  activePageId,
  onRefreshSettings,
  onSelectPage,
}) => {
  const [activeTab, setActiveTab] = useState<'pages' | 'theme'>('pages');

  // New Page creation state
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageId, setNewPageId] = useState('');

  // Save current active page configuration
  const handleExportPage = async () => {
    if (!activePageId) return;
    try {
      const res = await fetch(`/api/pages/${activePageId}`);
      if (!res.ok) throw new Error('Failed to load page config');
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `page-${activePageId}-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export page configuration.');
    }
  };

  // Import configuration
  const handleImportPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result;
        if (typeof text !== 'string') return;
        const config: PageConfig = JSON.parse(text);

        if (!config.id || !config.title) {
          throw new Error('Config file must contain "id" and "title" attributes');
        }

        // Validate on backend by creating/saving
        const checkRes = await fetch(`/api/pages/${config.id}`);
        const isOverwrite = checkRes.ok;

        if (isOverwrite) {
          if (!window.confirm(`Page with ID "${config.id}" already exists. Overwrite it?`)) {
            return;
          }
        }

        // 1. Create or save configuration
        let saveUrl = `/api/pages/${config.id}`;
        let method = 'PUT';

        if (!isOverwrite) {
          // Create the page inside global index list first
          const createRes = await fetch('/api/pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: config.id, title: config.title })
          });
          
          if (!createRes.ok) {
            const errData = await createRes.json();
            throw new Error(errData.error || 'Failed to create page registry');
          }
        }

        // Save layout details
        const saveRes = await fetch(saveUrl, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });

        if (!saveRes.ok) {
          throw new Error('Failed to import page layout contents');
        }

        alert('Import successful!');
        onRefreshSettings();
        onSelectPage(config.id);
        onClose();
      } catch (err: any) {
        console.error(err);
        alert(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim() || !newPageId.trim()) return;

    try {
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newPageId, title: newPageTitle })
      });

      if (response.ok) {
        const newPage = await response.json();
        setNewPageTitle('');
        setNewPageId('');
        onRefreshSettings();
        onSelectPage(newPage.id);
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create page');
    }
  };

  const handleDeletePage = async (pageId: string, pageTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete page "${pageTitle}"? All configurations will be lost.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
      if (res.ok) {
        onRefreshSettings();
        if (activePageId === pageId) {
          // Change selection to another remaining page if available
          const remaining = globalSettings.pagesList.filter(p => p.id !== pageId);
          if (remaining.length > 0) {
            onSelectPage(remaining[0].id);
          }
        }
      } else {
        alert('Failed to delete page');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete page');
    }
  };

  const handleChangeTheme = async (themeName: string) => {
    try {
      const updated = {
        ...globalSettings,
        globalTheme: themeName
      };
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        onRefreshSettings();
      }
    } catch (err) {
      console.error('Failed to change theme:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div 
        className="glass-panel modal-content" 
        style={{ 
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-glass)' 
        }}
      >
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-title)' }}>
            <Monitor size={18} style={{ color: 'var(--accent-color)' }} />
            Application Settings
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)' }}>
          <button
            onClick={() => setActiveTab('pages')}
            style={{
              padding: '0.5rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'pages' ? '2px solid var(--accent-color)' : 'none',
              color: activeTab === 'pages' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Manage Pages
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            style={{
              padding: '0.5rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'theme' ? '2px solid var(--accent-color)' : 'none',
              color: activeTab === 'theme' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Appearance
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'pages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* List Pages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>AVAILABLE DASHBOARDS:</span>
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px', 
                  maxHeight: '150px', 
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.15)',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                {globalSettings.pagesList.map(page => (
                  <div 
                    key={page.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: activePageId === page.id ? 'rgba(118, 102, 240, 0.1)' : 'transparent',
                      border: activePageId === page.id ? '1px solid rgba(118, 102, 240, 0.2)' : '1px solid transparent'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{page.title}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '10px' }}>({page.fileName})</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {activePageId === page.id && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                          onClick={handleExportPage}
                          title="Download configuration JSON file"
                        >
                          <Download size={12} /> Export
                        </button>
                      )}
                      
                      {globalSettings.pagesList.length > 1 && (
                        <button 
                          className="btn-icon" 
                          style={{ color: 'var(--danger-color)', padding: '2px' }}
                          onClick={() => handleDeletePage(page.id, page.title)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create Page Form */}
            <form onSubmit={handleCreatePage} className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 600 }}>CREATE NEW DASHBOARD:</span>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  required
                  placeholder="Page Title (e.g. Work Page)"
                  className="input-field"
                  style={{ flex: 1 }}
                  value={newPageTitle}
                  onChange={(e) => {
                    setNewPageTitle(e.target.value);
                    // Auto-slugify for ID
                    setNewPageId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
                  }}
                />
                
                <input
                  type="text"
                  required
                  placeholder="Page ID"
                  className="input-field"
                  style={{ width: '120px' }}
                  value={newPageId}
                  onChange={(e) => setNewPageId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
                <Plus size={16} /> Create Page
              </button>
            </form>

            {/* Import Page Form */}
            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>IMPORT CONFIGURATION:</span>
              <label 
                className="btn btn-secondary" 
                style={{ width: 'fit-content', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Upload size={16} /> Upload Config JSON
                <input 
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }} 
                  onChange={handleImportPage} 
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'theme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>GLOBAL APP THEME:</span>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    background: globalSettings.globalTheme === 'dark-glass' ? 'var(--accent-color)' : 'var(--bg-dropdown-hover)',
                    border: '1px solid var(--border-glass)',
                    color: globalSettings.globalTheme === 'dark-glass' ? '#fff' : 'var(--text-primary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-md)'
                  }}
                  onClick={() => handleChangeTheme('dark-glass')}
                >
                  Dark Glassmorphism
                </button>
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    background: globalSettings.globalTheme === 'light-glass' ? 'var(--accent-color)' : 'var(--bg-dropdown-hover)',
                    border: '1px solid var(--border-glass)',
                    color: globalSettings.globalTheme === 'light-glass' ? '#fff' : 'var(--text-primary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-md)'
                  }}
                  onClick={() => handleChangeTheme('light-glass')}
                >
                  Light Glassmorphism
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
