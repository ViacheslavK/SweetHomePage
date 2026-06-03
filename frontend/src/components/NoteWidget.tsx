import React, { useState } from 'react';
import { Edit2, Save } from 'lucide-react';
import type { Widget } from '@startme/shared';

interface NoteWidgetProps {
  widget: Widget;
  onSaveWidgetData: (widgetId: string, data: { content: string }) => void;
}

export const NoteWidget: React.FC<NoteWidgetProps> = ({ widget, onSaveWidgetData }) => {
  const initialContent = (widget.data && widget.data.content) || '';
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(initialContent === '');

  const handleSave = () => {
    onSaveWidgetData(widget.id, { content });
    setIsEditing(false);
  };

  // Safe and simple regex markdown parser
  const renderMarkdown = (md: string): string => {
    if (!md) return '<p style="color: var(--text-muted); font-style: italic;">No content. Click Edit to add note notes...</p>';

    // Escape HTML first to prevent XSS
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h4 style="margin-top: 10px; margin-bottom: 6px; font-weight: 600; color: var(--text-primary); font-family: var(--font-title);">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="margin-top: 14px; margin-bottom: 8px; font-weight: 600; color: var(--text-primary); font-family: var(--font-title);">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 style="margin-top: 18px; margin-bottom: 10px; font-weight: 700; color: var(--text-primary); font-family: var(--font-title);">$1</h2>');

    // Checkboxes / Tasks
    html = html.replace(/^\s*-\s*\[\s*\]\s*(.*$)/gim, '<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><input type="checkbox" disabled style="accent-color: var(--accent-color);" /> <span style="font-size: 0.85rem; color: var(--text-primary);">$1</span></div>');
    html = html.replace(/^\s*-\s*\[x\]\s*(.*$)/gim, '<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><input type="checkbox" checked disabled style="accent-color: var(--accent-color);" /> <span style="font-size: 0.85rem; color: var(--text-secondary); text-decoration: line-through;">$1</span></div>');

    // Bullet points
    html = html.replace(/^\s*-\s*(?!\[)(.*$)/gim, '<li style="font-size: 0.85rem; color: var(--text-primary); margin-left: 1rem; margin-top: 2px;">$1</li>');

    // Bold & Italics
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // External URLs
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--accent-color); text-decoration: none; font-weight: 500;">$1</a>');

    // Convert newlines to HTML br
    html = html.split('\n').join('<br />');

    return html;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Note toolbar */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '8px', 
          marginBottom: '0.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          paddingBottom: '0.5rem'
        }}
      >
        {isEditing ? (
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={handleSave}
          >
            <Save size={12} /> Save
          </button>
        ) : (
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => setIsEditing(true)}
          >
            <Edit2 size={12} /> Edit
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your markdown notes here... e.g. # Header, - [ ] Task item, [Link](url)"
            className="input-field"
            style={{
              width: '100%',
              flex: 1,
              resize: 'none',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              lineHeight: '1.4',
              padding: '0.75rem',
              background: 'rgba(0,0,0,0.25)'
            }}
          />
        ) : (
          <div 
            style={{ 
              flex: 1, 
              fontSize: '0.85rem', 
              lineHeight: '1.5',
              overflowY: 'auto',
              color: 'var(--text-secondary)'
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </div>
    </div>
  );
};
