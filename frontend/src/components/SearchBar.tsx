import React, { useState, useEffect, useRef } from 'react';
import { Search, ExternalLink, Folder, Tag, X } from 'lucide-react';
import type { FlatLinkInfo } from '@startme/shared';

interface SearchBarProps {
  onNavigateToPage: (pageId: string) => void;
}

interface SearchResult extends FlatLinkInfo {
  pageId: string;
  pageTitle: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onNavigateToPage }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search results when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Search query failed:', error);
      }
    }, 250); // Debounce fetch for 250ms

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleResultClick = (res: SearchResult) => {
    // Open link in new window
    window.open(res.url, '_blank', 'noopener,noreferrer');
    onNavigateToPage(res.pageId);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="search-bar-container" ref={containerRef} style={{ position: 'relative', width: '320px' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search 
          size={18} 
          style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)' }} 
        />
        <input
          type="text"
          placeholder="Search links, tags, folders..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          className="input-field"
          style={{
            width: '100%',
            paddingLeft: '38px',
            paddingRight: query ? '32px' : '12px',
            height: '38px',
            borderRadius: 'var(--radius-sm)'
          }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            style={{
              position: 'absolute',
              right: '10px',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && query.trim() && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'rgba(21, 23, 33, 0.95)',
            boxShadow: '0 15px 30px rgba(0, 0, 0, 0.6)',
            borderRadius: 'var(--radius-md)',
            maxHeight: '350px',
            overflowY: 'auto',
            zIndex: 100,
            padding: '0.75rem',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {results.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
              No matches found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {results.map((res) => (
                <div
                  key={res.id}
                  onClick={() => handleResultClick(res)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)'
                  }}
                  className="search-item-hover"
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {res.title}
                    </span>
                    <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                    {res.url}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginTop: '6px', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--accent-color)' }}>
                      <Folder size={11} />
                      <span>{res.pageTitle} &rsaquo; {res.path.length > 0 ? res.path.join(' / ') : res.widgetTitle}</span>
                    </div>

                    {res.tags && res.tags.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)' }}>
                        <Tag size={11} />
                        <span style={{ display: 'flex', gap: '4px' }}>
                          {res.tags.map(t => (
                            <span 
                              key={t} 
                              style={{ 
                                background: 'rgba(255,255,255,0.06)', 
                                padding: '1px 5px', 
                                borderRadius: '4px',
                                border: '1px solid var(--border-glass)'
                              }}
                            >
                              {t}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
