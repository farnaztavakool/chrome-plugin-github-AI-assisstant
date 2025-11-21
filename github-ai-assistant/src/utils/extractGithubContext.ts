/**
 * Extracts context from the current GitHub page matching the LLM schema.
 */

interface PullRequest {
  title: string;
  author: string;
  url: string;
  diff_size: number | null;
  comments_count: number;
  status: string;
  number: number | null;
}

interface File {
  path: string;
  language: string;
  url: string;
  size: number;
}

interface ExtractedEntities {
  pull_requests: PullRequest[];
  files: File[];
  commits: any[];
}

interface GithubContext {
  url: string;
  page_type: string;
  dom_snapshot: string;
  extracted_entities: ExtractedEntities;
}

export function extractGithubContext(): GithubContext {
  const context: GithubContext = {
    url: window.location.href,
    page_type: getPageType(),
    dom_snapshot: getDomSnapshot(), // Simplified text representation
    extracted_entities: {
      pull_requests: [],
      files: [],
      commits: []
    }
  };

  if (context.page_type === 'pr') {
    extractPrDetails(context);
  } else if (context.page_type === 'repo' && window.location.pathname.includes('/pulls')) {
    extractPrList(context);
  } else if (context.page_type === 'repo') {
    // Maybe file list if on root?
    // For now, just leave empty.
  }

  return context;
}

function getPageType(): string {
  const path = window.location.pathname;
  if (path.includes('/pull/')) return 'pr';
  if (path.includes('/pulls')) return 'repo'; // technically repo/pulls list
  if (path.includes('/issues')) return 'issues';
  if (path.includes('/blob/')) return 'file';
  if (path.includes('/commit/')) return 'commit';
  return 'repo';
}

function getDomSnapshot(): string {
  // Return a simplified structure to avoid token limits
  // Just return the innerText of the main content area, truncated
  const main = document.querySelector('main') || document.body;
  return main.innerText.substring(0, 20000); // Limit to 20k chars
}

function extractPrDetails(context: GithubContext): void {
  // Single PR view
  const titleEl = document.querySelector('.js-issue-title');
  const authorEl = document.querySelector('.author');
  const prNumberMatch = window.location.pathname.match(/\/pull\/(\d+)/);
  
  // We can add the current PR to the list so the LLM knows about it
  context.extracted_entities.pull_requests.push({
    title: titleEl ? titleEl.textContent?.trim() || "Unknown" : "Unknown",
    author: authorEl ? authorEl.textContent?.trim() || "Unknown" : "Unknown",
    url: window.location.href,
    diff_size: null, // Hard to get from header directly without parsing text like "+100 -50"
    comments_count: document.querySelectorAll('.timeline-comment').length,
    status: getPrStatus(),
    number: prNumberMatch ? parseInt(prNumberMatch[1]) : null
  });

  // Extract Files (if on files tab)
  const fileHeaders = document.querySelectorAll<HTMLElement>('.file-header');
  fileHeaders.forEach(header => {
     const path = header.dataset.path;
     if (path) {
         context.extracted_entities.files.push({
             path: path,
             language: path.split('.').pop() || '', // simple extension guess
             url: window.location.href + '#' + header.id, // anchor
             size: 0 // We don't easily know size without api
         });
     }
  });
}

function extractPrList(context: GithubContext): void {
  const rows = document.querySelectorAll('.js-issue-row');
  rows.forEach(row => {
    const titleLink = row.querySelector<HTMLAnchorElement>('a.js-navigation-open');
    const authorLink = row.querySelector<HTMLAnchorElement>('.opened-by a');
    const commentLink = row.querySelector<HTMLAnchorElement>('a[aria-label*="comment"]');
    const status = 'open'; // If we are on open PRs list

    if (titleLink) {
        context.extracted_entities.pull_requests.push({
            title: titleLink.textContent?.trim() || "Unknown",
            author: authorLink ? authorLink.textContent?.trim() || "Unknown" : "Unknown",
            url: titleLink.href,
            diff_size: null, // Not visible in list view usually
            comments_count: commentLink ? parseInt(commentLink.textContent?.trim() || '0') : 0,
            status: status,
            number: null
        });
    }
  });
}

function getPrStatus(): string {
    if (document.querySelector('.State--purple')) return 'merged';
    if (document.querySelector('.State--red')) return 'closed';
    if (document.querySelector('.State--green')) return 'open';
    return 'unknown';
}

