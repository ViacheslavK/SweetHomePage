import type { BookmarkItem, Link, Group } from '@startme/shared';

/**
 * Parses browser-exported Netscape Bookmark HTML files using browser's DOMParser.
 */
export function parseBookmarksHTML(htmlText: string): BookmarkItem[] {
  const parser = new DOMParser();
  // Use text/html to leverage browser's robust HTML decoding and structural normalization
  const doc = parser.parseFromString(htmlText, 'text/html');
  const firstDL = doc.querySelector('dl');
  if (!firstDL) return [];
  return parseDL(firstDL);
}

function parseDL(dlElement: Element): BookmarkItem[] {
  const items: BookmarkItem[] = [];
  const children = Array.from(dlElement.childNodes);

  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const el = node as Element;
    const tagName = el.tagName.toUpperCase();

    if (tagName === 'DT') {
      const h3 = el.querySelector('h3');
      const a = el.querySelector('a');

      if (h3) {
        // Folder found
        const lowerTitle = (h3.textContent || '').trim().toLowerCase();
        const isPersonalToolbar = h3.getAttribute('personal_toolbar_folder') === 'true' || 
                                  h3.getAttribute('PERSONAL_TOOLBAR_FOLDER') === 'true';
        const isToolbarName = lowerTitle === 'bookmarks toolbar' || lowerTitle === 'bookmarks bar' || lowerTitle === 'bookmarksbar';
        
        // Normalize bookmarks toolbar group name to exact lowercase "bookmarks toolbar"
        const title = (isPersonalToolbar || isToolbarName) ? 'bookmarks toolbar' : (h3.textContent || 'Untitled Folder');

        // Look for corresponding DL containing children.
        // It could be nested inside DT, or follow DT as a sibling.
        let nextDL: Element | null = el.querySelector('dl');
        if (!nextDL) {
          let sibling = el.nextElementSibling;
          while (sibling) {
            const siblingTag = sibling.tagName.toUpperCase();
            if (siblingTag === 'DL') {
              nextDL = sibling;
              break;
            }
            if (siblingTag === 'DT') {
              break; // Another item started, DL was skipped or folder is empty
            }
            sibling = sibling.nextElementSibling;
          }
        }

        const group: Group = {
          id: 'group-' + Math.random().toString(36).substring(2, 9),
          type: 'group',
          title: title,
          tags: [],
          children: nextDL ? parseDL(nextDL) : []
        };
        items.push(group);
      } else if (a) {
        // Root or standalone link
        const url = a.getAttribute('href') || '';
        const title = a.textContent || url;
        const tagsAttr = a.getAttribute('tags') || '';
        const tags = tagsAttr ? tagsAttr.split(',').map(t => t.trim()) : [];
        
        const linkItem: Link = {
          id: 'link-' + Math.random().toString(36).substring(2, 9),
          type: 'link',
          title: title,
          url: url,
          tags: tags
        };
        items.push(linkItem);
      }
    } else if (tagName === 'A') {
      // Direct child link of DL
      const url = el.getAttribute('href') || '';
      const title = el.textContent || url;
      const tagsAttr = el.getAttribute('tags') || '';
      const tags = tagsAttr ? tagsAttr.split(',').map(t => t.trim()) : [];

      const linkItem: Link = {
        id: 'link-' + Math.random().toString(36).substring(2, 9),
        type: 'link',
        title: title,
        url: url,
        tags: tags
      };
      items.push(linkItem);
    }
  }

  return items;
}
