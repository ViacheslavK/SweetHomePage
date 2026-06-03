import { 
  readGlobalSettings, 
  readPageConfig, 
  readBrokenLinks, 
  writeBrokenLinks 
} from './storage.js';
import { getAllLinksFromPage } from '@startme/shared';

let isRunning = false;

export function isCheckerRunning(): boolean {
  return isRunning;
}

interface CheckerOccurrence {
  id: string;
  title: string;
  pageId: string;
  pageTitle: string;
  widgetTitle: string;
  path: string[];
}

interface BrokenLinkResult {
  url: string;
  type: 'redirect' | 'broken';
  status: number;
  message: string;
  redirectUrl?: string;
  occurrences: CheckerOccurrence[];
}

async function checkUrl(url: string): Promise<{ type: 'ok' | 'redirect' | 'broken'; status: number; message: string; redirectUrl?: string }> {
  const timeoutMs = 6000;
  
  // Basic validation to avoid checking invalid/empty URLs
  if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return {
      type: 'broken',
      status: 0,
      message: 'Invalid URL scheme. Must be http:// or https://'
    };
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Try HEAD first to conserve bandwidth
    let res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    // If HEAD fails with methods not allowed/supported, fall back to GET
    if (res.status === 405 || res.status === 404 || res.status === 501 || res.status === 403) {
      const getController = new AbortController();
      const getId = setTimeout(() => getController.abort(), timeoutMs);
      res = await fetch(url, {
        method: 'GET',
        signal: getController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(getId);
    }
    clearTimeout(id);

    // Normalize URLs to check redirects, avoiding simple trailing slash differences
    const normOriginal = url.replace(/\/$/, '');
    const normFinal = (res.url || url).replace(/\/$/, '');

    if (normFinal !== normOriginal) {
      return {
        type: 'redirect',
        status: res.status,
        message: `Redirected`,
        redirectUrl: res.url
      };
    }

    if (res.status >= 400) {
      return {
        type: 'broken',
        status: res.status,
        message: `HTTP Status ${res.status}`
      };
    }

    return {
      type: 'ok',
      status: res.status,
      message: 'OK'
    };
  } catch (error: any) {
    clearTimeout(id);
    let msg = 'Connection Error';
    if (error.name === 'AbortError') {
      msg = 'Request Timeout';
    } else if (error.code) {
      msg = `Network Code: ${error.code}`; // e.g. ENOTFOUND, ECONNREFUSED
    } else if (error.message) {
      msg = error.message;
    }
    return {
      type: 'broken',
      status: 0,
      message: msg
    };
  }
}

export async function runChecker(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    // 1. Mark status as running
    const state = await readBrokenLinks();
    state.running = true;
    state.lastChecked = new Date().toISOString();
    await writeBrokenLinks(state);

    // 2. Fetch all links across all pages
    const globalSettings = await readGlobalSettings();
    interface LocalLinkInfo {
      id: string;
      title: string;
      url: string;
      tags: string[];
      widgetId: string;
      widgetTitle: string;
      path: string[];
      pageId: string;
      pageTitle: string;
    }
    
    const allLinks: LocalLinkInfo[] = [];

    for (const pageItem of globalSettings.pagesList) {
      try {
        const pageConfig = await readPageConfig(pageItem.id);
        const flatLinks = getAllLinksFromPage(pageConfig);
        const mappedLinks = flatLinks.map(l => ({
          ...l,
          pageId: pageItem.id,
          pageTitle: pageItem.title
        }));
        allLinks.push(...mappedLinks);
      } catch (err) {
        console.error(`Checker failed to read page config ${pageItem.id}:`, err);
      }
    }

    // Deduplicate URLs
    const uniqueUrlsMap = new Map<string, LocalLinkInfo[]>();
    for (const link of allLinks) {
      const list = uniqueUrlsMap.get(link.url) || [];
      list.push(link);
      uniqueUrlsMap.set(link.url, list);
    }

    const urlsToCheck = Array.from(uniqueUrlsMap.keys());
    const results: BrokenLinkResult[] = [];

    // Limit concurrency to 5 requests
    const CONCURRENCY = 5;
    const queue = [...urlsToCheck];

    async function worker() {
      while (queue.length > 0) {
        const url = queue.shift();
        if (!url) continue;

        const checkRes = await checkUrl(url);
        const sourceLinks = uniqueUrlsMap.get(url) || [];

        if (checkRes.type !== 'ok') {
          results.push({
            url,
            type: checkRes.type,
            status: checkRes.status,
            message: checkRes.message,
            redirectUrl: checkRes.redirectUrl,
            occurrences: sourceLinks.map(l => ({
              id: l.id,
              title: l.title,
              pageId: l.pageId,
              pageTitle: l.pageTitle,
              widgetTitle: l.widgetTitle,
              path: l.path
            }))
          });
        }
      }
    }

    // Spawn workers
    const workers = Array(Math.min(CONCURRENCY, urlsToCheck.length))
      .fill(null)
      .map(() => worker());

    await Promise.all(workers);

    // Save final results
    await writeBrokenLinks({
      lastChecked: new Date().toISOString(),
      running: false,
      results
    });
  } catch (error) {
    console.error('Broken link checker encountered a severe error:', error);
  } finally {
    isRunning = false;
    try {
      const state = await readBrokenLinks();
      state.running = false;
      await writeBrokenLinks(state);
    } catch {}
  }
}
