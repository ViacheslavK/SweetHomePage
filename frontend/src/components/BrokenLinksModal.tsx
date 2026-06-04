import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, RefreshCw, CheckCircle, ArrowRight, Trash2 } from 'lucide-react';
import type { PageConfig, BookmarkItem } from '@startme/shared';

interface BrokenLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshPageData: () => void;
}

interface Occurrence {
  id: string;
  title: string;
  pageId: string;
  pageTitle: string;
  widgetTitle: string;
  path: string[];
}

interface BrokenResult {
  url: string;
  type: 'redirect' | 'broken';
  status: number;
  message: string;
  redirectUrl?: string;
  occurrences: Occurrence[];
}

export const BrokenLinksModal: React.FC<BrokenLinksModalProps> = ({ isOpen, onClose, onRefreshPageData }) => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [results, setResults] = useState<BrokenResult[]>([]);
  const [activeTab, setActiveTab] = useState<'broken' | 'redirect'>('broken');

  // Load results from backend
  const loadResults = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/checker/results');
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setLastChecked(data.lastChecked);
        setChecking(data.running);
      }
    } catch (error) {
      console.error('Failed to load checker results:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadResults();
    }
  }, [isOpen]);

  // Poll for status if checking is active
  useEffect(() => {
    let interval: any;
    if (checking) {
      interval = setInterval(async () => {
        try {
          const response = await fetch('/api/checker/results');
          if (response.ok) {
            const data = await response.json();
            setChecking(data.running);
            if (!data.running) {
              setResults(data.results || []);
              setLastChecked(data.lastChecked);
              clearInterval(interval);
            }
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [checking]);

  const handleRunCheck = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await fetch('/api/checker/run', { method: 'POST' });
    } catch (error) {
      console.error('Failed to trigger link checker:', error);
      setChecking(false);
    }
  };

  // Helper function to remove a link recursively from a list of BookmarkItems
  const removeLinkFromList = (items: BookmarkItem[], targetId: string): boolean => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'link' && item.id === targetId) {
        items.splice(i, 1);
        return true;
      }
      if (item.type === 'group' && item.children) {
        const found = removeLinkFromList(item.children, targetId);
        if (found) return true;
      }
    }
    return false;
  };

  // Helper function to update a link's URL recursively
  const updateLinkUrlInList = (items: BookmarkItem[], targetId: string, newUrl: string): boolean => {
    for (const item of items) {
      if (item.type === 'link' && item.id === targetId) {
        item.url = newUrl;
        return true;
      }
      if (item.type === 'group' && item.children) {
        const found = updateLinkUrlInList(item.children, targetId, newUrl);
        if (found) return true;
      }
    }
    return false;
  };

  const handleDeleteOccurrence = async (occ: Occurrence) => {
    if (!window.confirm(`Delete the link "${occ.title}" from page "${occ.pageTitle}"?`)) {
      return;
    }

    try {
      // 1. Fetch page config
      const res = await fetch(`/api/pages/${occ.pageId}`);
      if (!res.ok) throw new Error('Failed to fetch page config');
      const config: PageConfig = await res.json();

      // 2. Remove link
      let modified = false;
      for (const widget of config.widgets) {
        if (widget.type === 'bookmarks' && widget.data && widget.data.items) {
          if (removeLinkFromList(widget.data.items, occ.id)) {
            modified = true;
          }
        }
      }

      if (modified) {
        // 3. Save config
        const saveRes = await fetch(`/api/pages/${occ.pageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        if (!saveRes.ok) throw new Error('Failed to save page config');

        alert('Link successfully deleted!');
        onRefreshPageData();
        loadResults(); // Reload broken links list
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleApplyRedirect = async (result: BrokenResult, occ: Occurrence) => {
    if (!result.redirectUrl) return;

    try {
      // 1. Fetch page config
      const res = await fetch(`/api/pages/${occ.pageId}`);
      if (!res.ok) throw new Error('Failed to fetch page config');
      const config: PageConfig = await res.json();

      // 2. Update url
      let modified = false;
      for (const widget of config.widgets) {
        if (widget.type === 'bookmarks' && widget.data && widget.data.items) {
          if (updateLinkUrlInList(widget.data.items, occ.id, result.redirectUrl)) {
            modified = true;
          }
        }
      }

      if (modified) {
        // 3. Save config
        const saveRes = await fetch(`/api/pages/${occ.pageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        if (!saveRes.ok) throw new Error('Failed to save page config');

        alert('Link URL updated to redirected address!');
        onRefreshPageData();
        loadResults();
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  const filteredResults = results.filter(r => r.type === activeTab);

  return (
    <div className="modal-overlay">
      <div 
        className="glass-panel modal-content" 
        style={{ 
          maxWidth: '800px', 
          width: '95%', 
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-glass)' 
        }}
      >
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
            <AlertTriangle size={22} style={{ color: checking ? 'var(--warning-color)' : 'var(--danger-color)' }} />
            Link Health Diagnostics
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Status Area */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'rgba(0,0,0,0.2)',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-glass)',
            fontSize: '0.85rem'
          }}
        >
          <div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Last scan: {lastChecked ? new Date(lastChecked).toLocaleString() : 'Never'}
            </div>
            {checking && (
              <div style={{ color: 'var(--warning-color)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <RefreshCw size={14} className="animate-spin" style={{ animation: 'spin 2s linear infinite' }} />
                Scanning all pages in background...
              </div>
            )}
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleRunCheck}
            disabled={checking}
          >
            <RefreshCw size={16} className={checking ? "animate-spin" : ""} style={checking ? { animation: 'spin 2s linear infinite' } : {}} />
            {checking ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)' }}>
          <button
            onClick={() => setActiveTab('broken')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'broken' ? '2px solid var(--danger-color)' : 'none',
              color: activeTab === 'broken' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'broken' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Broken Links ({results.filter(r => r.type === 'broken').length})
          </button>
          <button
            onClick={() => setActiveTab('redirect')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'redirect' ? '2px solid var(--warning-color)' : 'none',
              color: activeTab === 'redirect' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'redirect' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Redirects ({results.filter(r => r.type === 'redirect').length})
          </button>
        </div>

        {/* Results List */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: '300px', maxHeight: '400px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading results...</div>
          ) : filteredResults.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '3rem', color: 'var(--text-muted)', gap: '10px' }}>
              <CheckCircle size={36} style={{ color: 'var(--success-color)' }} />
              <span>No {activeTab} links found! Everything is healthy.</span>
            </div>
          ) : (
            filteredResults.map((res, i) => (
              <div 
                key={i} 
                className="glass-panel" 
                style={{ 
                  padding: '1rem', 
                  background: 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {res.url}
                    </div>
                    {res.type === 'redirect' && res.redirectUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--success-color)', marginTop: '4px' }}>
                        <span>Redirects to</span>
                        <ArrowRight size={12} />
                        <span style={{ wordBreak: 'break-all' }}>{res.redirectUrl}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Reason: <span style={{ color: res.type === 'broken' ? 'var(--danger-color)' : 'var(--warning-color)' }}>{res.message}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>OCCURRENCES:</span>
                  {res.occurrences.map((occ, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.15)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--accent-color)', fontWeight: 500 }}>[{occ.pageTitle}]</span>
                        <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>
                          {occ.widgetTitle} &rsaquo; {occ.path.length > 0 ? occ.path.join(' / ') + ' / ' : ''}<strong>{occ.title}</strong>
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {res.type === 'redirect' && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                            onClick={() => handleApplyRedirect(res, occ)}
                          >
                            Apply Link Fix
                          </button>
                        )}
                        <button 
                          className="btn-icon" 
                          style={{ color: 'var(--danger-color)', padding: '2px' }}
                          onClick={() => handleDeleteOccurrence(occ)}
                          title="Delete link"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
