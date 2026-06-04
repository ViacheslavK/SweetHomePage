import { Router, Request, Response } from 'express';
import { lookup } from 'dns/promises';
import { 
  readGlobalSettings, 
  writeGlobalSettings, 
  readPageConfig, 
  writePageConfig, 
  deletePageConfig,
  readBrokenLinks
} from './storage.js';
import { runChecker, isCheckerRunning } from './checker.js';
import { PageConfig, PageListItem, getAllLinksFromPage } from '@startme/shared';

const router = Router();

/**
 * Decodes common HTML entities in a single pass to avoid double-unescaping.
 * e.g. "&amp;amp;" stays as "&amp;" instead of becoming "&" twice.
 * (Fixes js/double-escaping, alerts #4 and #5)
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');  // must be last to avoid double-decoding
}

// --- Global Settings ---
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const settings = await readGlobalSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to read settings' });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    await writeGlobalSettings(settings);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid settings format' });
  }
});

// --- Page Configurations ---
router.get('/pages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = await readPageConfig(id);
    res.json(page);
  } catch (error: any) {
    res.status(404).json({ error: `Page with ID '${req.params.id}' not found` });
  }
});

router.post('/pages', async (req: Request, res: Response) => {
  try {
    const { id, title } = req.body;
    if (!id || !title) {
      return res.status(400).json({ error: 'id and title are required fields' });
    }

    const sanitizedId = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!sanitizedId) {
      return res.status(400).json({ error: 'Invalid page ID' });
    }

    const settings = await readGlobalSettings();
    const exists = settings.pagesList.some(p => p.id === sanitizedId);
    if (exists) {
      return res.status(409).json({ error: `Page with ID '${sanitizedId}' already exists` });
    }

    // 1. Create page config file
    const newPage: PageConfig = {
      version: '1.0.0',
      id: sanitizedId,
      title: title,
      settings: {
        columns: 3,
        backgroundUrl: '',
        customCss: ''
      },
      widgets: []
    };
    await writePageConfig(sanitizedId, newPage);

    // 2. Add to pagesList
    const newPageListItem: PageListItem = {
      id: sanitizedId,
      title: title,
      fileName: `page-${sanitizedId}.json`
    };
    settings.pagesList.push(newPageListItem);
    if (!settings.activePageId || settings.pagesList.length === 1) {
      settings.activePageId = sanitizedId;
    }
    await writeGlobalSettings(settings);

    res.status(201).json(newPage);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create page' });
  }
});

router.put('/pages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = req.body;
    await writePageConfig(id, config);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid page configuration' });
  }
});

router.delete('/pages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const settings = await readGlobalSettings();
    
    // Check if page exists in list
    const pageIndex = settings.pagesList.findIndex(p => p.id === id);
    if (pageIndex === -1) {
      return res.status(404).json({ error: `Page with ID '${id}' not found in settings` });
    }

    // Remove file
    await deletePageConfig(id);

    // Update global list
    settings.pagesList.splice(pageIndex, 1);

    // Adjust activePageId if we deleted the active one
    if (settings.activePageId === id) {
      settings.activePageId = settings.pagesList.length > 0 ? settings.pagesList[0].id : null;
    }

    await writeGlobalSettings(settings);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete page' });
  }
});

// --- Search Over All Links and Tags ---
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q;
    if (!query || typeof query !== 'string') {
      return res.json([]);
    }

    const searchTerm = query.toLowerCase().trim();
    const settings = await readGlobalSettings();
    const results = [];

    for (const pageItem of settings.pagesList) {
      try {
        const pageConfig = await readPageConfig(pageItem.id);
        const links = getAllLinksFromPage(pageConfig);

        for (const link of links) {
          const matchTitle = link.title.toLowerCase().includes(searchTerm);
          const matchUrl = link.url.toLowerCase().includes(searchTerm);
          const matchTag = link.tags.some(t => t.toLowerCase().includes(searchTerm));
          const matchPath = link.path.some(p => p.toLowerCase().includes(searchTerm));
          const matchWidget = link.widgetTitle.toLowerCase().includes(searchTerm);

          if (matchTitle || matchUrl || matchTag || matchPath || matchWidget) {
            results.push({
              ...link,
              pageId: pageItem.id,
              pageTitle: pageItem.title
            });
          }
        }
      } catch (err) {
        console.error(`Search failed to parse page config ${pageItem.id}:`, err);
      }
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Search execution failed' });
  }
});

// --- Duplicate URL Checker ---
router.get('/links/check-duplicate', async (req: Request, res: Response) => {
  try {
    const urlParam = req.query.url;
    const currentPageId = req.query.currentPageId;
    const excludeLinkId = req.query.excludeLinkId;

    if (!urlParam || typeof urlParam !== 'string') {
      return res.status(400).json({ error: 'url query parameter is required' });
    }

    const targetUrl = urlParam.trim().toLowerCase().replace(/\/$/, '');
    const settings = await readGlobalSettings();
    const duplicates: Array<{ pageId: string, pageTitle: string, title: string }> = [];

    for (const pageItem of settings.pagesList) {
      try {
        const pageConfig = await readPageConfig(pageItem.id);
        const links = getAllLinksFromPage(pageConfig);
        
        for (const link of links) {
          if (excludeLinkId && link.id === excludeLinkId) {
            continue;
          }
          const checkUrl = link.url.trim().toLowerCase().replace(/\/$/, '');
          if (checkUrl === targetUrl) {
            duplicates.push({
              pageId: pageItem.id,
              pageTitle: pageItem.title,
              title: link.title
            });
          }
        }
      } catch (err) {
        console.error(`Duplicate check failed to read page ${pageItem.id}:`, err);
      }
    }

    res.json({
      exists: duplicates.length > 0,
      occurrences: duplicates
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Duplicate check execution failed' });
  }
});

// --- SSRF Protection Helper ---
/**
 * Returns true if the given IP address is a private/internal address
 * that should not be reachable from a server-side fetch (SSRF mitigation).
 * Blocks: loopback, RFC-1918 private ranges, link-local (169.254.x.x),
 * and IPv6 loopback/link-local.
 */
function isPrivateIp(ip: string): boolean {
  // IPv6 loopback and link-local
  if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) {
    return true;
  }
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false; // not IPv4, treat as safe
  const [a, b] = parts;
  return (
    a === 127 ||                          // 127.0.0.0/8  loopback
    a === 10 ||                           // 10.0.0.0/8   RFC-1918
    (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12 RFC-1918
    (a === 192 && b === 168) ||           // 192.168.0.0/16 RFC-1918
    (a === 169 && b === 254) ||           // 169.254.0.0/16 link-local / cloud metadata
    a === 0                               // 0.0.0.0/8
  );
}

// --- URL Metadata Scraper ---
router.get('/links/metadata', async (req: Request, res: Response) => {
  try {
    const urlParam = req.query.url;
    if (!urlParam || typeof urlParam !== 'string') {
      return res.status(400).json({ error: 'url query parameter is required' });
    }

    let targetUrl = urlParam.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // --- SSRF validation ---
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // Only allow http and https schemes
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only http and https URLs are allowed' });
    }

    // Block bare IP literals that are private
    const hostname = parsedUrl.hostname;
    if (isPrivateIp(hostname)) {
      return res.status(400).json({ error: 'Requests to private/internal addresses are not allowed' });
    }

    // Resolve hostname to IP and verify it is not a private address
    // (prevents DNS rebinding attacks)
    try {
      const resolved = await lookup(hostname);
      if (isPrivateIp(resolved.address)) {
        return res.status(400).json({ error: 'Requests to private/internal addresses are not allowed' });
      }
    } catch {
      // If DNS resolution fails, refuse the request
      return res.json({ title: '', description: '' });
    }
    // Use canonical parsed URL that passed validation.
    const safeTargetUrl = parsedUrl.toString();
    // --- end SSRF validation ---

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(safeTargetUrl, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok || (response.status >= 300 && response.status < 400)) {
        return res.json({ title: '', description: '' });
      }

      const html = await response.text();

      // Extract title
      let title = '';
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = decodeHtmlEntities(titleMatch[1].trim());
      }

      // Extract description
      let description = '';
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
                        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
      if (descMatch && descMatch[1]) {
        description = decodeHtmlEntities(descMatch[1].trim());
      }

      res.json({ title, description });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      // Log safely — pass targetUrl as a structured argument, not interpolated into the format string
      // (Fixes js/tainted-format-string, alert #3)
      console.warn('Metadata fetch failed:', { url: targetUrl, error: fetchErr });
      res.json({ title: '', description: '' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Metadata scraper failed' });
  }
});

// --- Broken Link Checker ---
router.get('/checker/results', async (req: Request, res: Response) => {
  try {
    const data = await readBrokenLinks();
    res.json({
      ...data,
      running: isCheckerRunning()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to read checker results' });
  }
});

router.post('/checker/run', async (req: Request, res: Response) => {
  try {
    if (isCheckerRunning()) {
      return res.status(409).json({ message: 'Checker is already running' });
    }
    
    // Trigger in background
    runChecker().catch(err => console.error('Background checker crash:', err));
    
    res.status(202).json({ message: 'Link check started' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to start checker' });
  }
});

export default router;
