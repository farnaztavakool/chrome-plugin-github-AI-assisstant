/**
 * Action implementations for manipulating the GitHub page.
 */

interface RepoContext {
  owner: string;
  repo: string;
}

interface PullRequest {
  url: string;
  html_url?: string;
  number?: number;
  additions?: number;
  deletions?: number;
  diff_size?: number;
}

export function navigateToUrl(url: string): void {
  window.location.href = url;
}

export function navigateToPr(prNumber: number | string): void {
  const parts = window.location.pathname.split('/').filter(Boolean);
  // Assuming we are in /owner/repo/...
  if (parts.length >= 2) {
    const owner = parts[0];
    const repo = parts[1];
    window.location.href = `/${owner}/${repo}/pull/${prNumber}`;
  } else {
    console.error("Cannot determine repo context for navigation.");
  }
}

export function openTab(tabName: string): void {
  // tabName: files, commits, checks, conversation
  // URL params: ?tab=files, etc. 
  // Or finding the tab button.
  const tabMap: Record<string, string> = {
    'conversation': 'conversation',
    'commits': 'commits',
    'checks': 'checks',
    'files': 'files' // "Files changed"
  };
  
  const target = tabMap[tabName.toLowerCase()];
  if (!target) return;

  // Try clicking the tab data-tab-item or href matching
  const tabs = Array.from(document.querySelectorAll<HTMLElement>('.tabnav-tab'));
  for (const tab of tabs) {
    const tabElement = tab as HTMLAnchorElement;
    if (tabElement.href?.endsWith(`/${target}`) || tab.dataset.tabItem === target || (target === 'files' && tab.innerText.includes('Files changed'))) {
      tab.click();
      return;
    }
  }
  // Fallback: Modify URL parameters
  const url = new URL(window.location.href);
  // /pull/123/files
  if (window.location.pathname.includes('/pull/')) {
    const basePath = window.location.pathname.split('/').slice(0, 5).join('/'); // /owner/repo/pull/123
    if (target === 'conversation') window.location.href = basePath;
    else window.location.href = `${basePath}/${target}`;
  }
}

export function scrollToFile(filename: string): void {
  // In "Files changed" view, files have headers with ids or data attributes
  // file-header usually has data-path="path/to/file"
  const headers = Array.from(document.querySelectorAll<HTMLElement>('.file-header'));
  for (const header of headers) {
    if (header.dataset.path === filename || header.dataset.path?.includes(filename)) {
      header.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight it temporarily
      header.style.border = "2px solid yellow";
      setTimeout(() => header.style.border = "", 3000);
      return;
    }
  }
  console.warn(`File ${filename} not found in view.`);
}

export function expandAllHiddenDiffs(): void {
  // "Load diff" buttons
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.js-diff-load-container button, button.load-diff-button'));
  buttons.forEach(btn => btn.click());
}

export function clickElement(selector: string): void {
  const el = document.querySelector<HTMLElement>(selector);
  if (el) {
    el.click();
  } else {
    console.warn(`Element ${selector} not found.`);
  }
}

export function highlightDom(selector: string): void {
  const el = document.querySelector<HTMLElement>(selector);
  if (el) {
    el.style.outline = "3px solid #f00";
    el.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
    setTimeout(() => {
        el.style.outline = "";
        el.style.backgroundColor = "";
    }, 3000);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
      console.warn("highlightDom: Element not found", selector);
  }
}

export function scrollToSelector(selector: string): void {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// --- Advanced Actions requiring List Analysis ---

async function fetchPrStats(owner: string, repo: string): Promise<PullRequest[]> {
  // Fetch open PRs from API
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&sort=updated&direction=desc`);
    if (!response.ok) return [];
    const prs: PullRequest[] = await response.json();
    
    // We need details (additions/deletions) which are not in the list response by default fully?
    // Actually list response doesn't have additions/deletions. We might need to fetch individual PRs or use GraphQL.
    // For this mock/demo, we will fetch details for the top 5 PRs to avoid rate limits.
    
    const detailedPrs = await Promise.all(prs.slice(0, 5).map(async pr => {
        const detRes = await fetch(pr.url); // API url
        return detRes.json() as Promise<PullRequest>;
    }));
    
    return detailedPrs;
  } catch (e) {
    console.error("Error fetching PRs", e);
    return [];
  }
}

function getRepoContext(): RepoContext | null {
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
  return null;
}

export async function goToLargestDiffPr(): Promise<void> {
    const ctx = getRepoContext();
    if (!ctx) return;
    
    const prs = await fetchPrStats(ctx.owner, ctx.repo);
    if (prs.length === 0) return;

    // Find max additions + deletions
    const largest = prs.reduce((prev, current) => {
        const prevSize = (prev.additions || 0) + (prev.deletions || 0);
        const currSize = (current.additions || 0) + (current.deletions || 0);
        return currSize > prevSize ? current : prev;
    });

    if (largest && largest.html_url) {
        window.location.href = largest.html_url;
    }
}

export async function highlightLargestDiffPr(): Promise<void> {
    // Identify largest diff from API, then highlight in the list if visible
    const ctx = getRepoContext();
    if (!ctx) return;

    const prs = await fetchPrStats(ctx.owner, ctx.repo);
    if (prs.length === 0) return;

    const largest = prs.reduce((prev, current) => {
        const prevSize = (prev.additions || 0) + (prev.deletions || 0);
        const currSize = (current.additions || 0) + (current.deletions || 0);
        return currSize > prevSize ? current : prev;
    });
    
    // Find the row in the DOM
    const rowId = `issue_${largest.number}`;
    const row = document.getElementById(rowId);
    if (row) {
        row.style.backgroundColor = "#fffbdd"; // yellow highlight
        row.style.border = "2px solid orange";
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

export async function goToMostCommentedPr(): Promise<void> {
    const ctx = getRepoContext();
    if (!ctx) return;
    
    // Simply using the list response is enough for comments usually
    const response = await fetch(`https://api.github.com/repos/${ctx.owner}/${ctx.repo}/pulls?state=open&sort=popularity&direction=desc`);
    if (response.ok) {
        const prs: PullRequest[] = await response.json();
        if (prs.length > 0 && prs[0].html_url) {
            window.location.href = prs[0].html_url;
        }
    }
}

