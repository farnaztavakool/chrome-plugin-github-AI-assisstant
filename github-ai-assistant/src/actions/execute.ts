import { 
  navigateToPr, 
  navigateToUrl, 
  openTab, 
  scrollToFile, 
  highlightDom,
  scrollToSelector,
  clickElement
} from './pageActions.js';

export interface Action {
  type: string;
  target_url?: string;
  url?: string;
  selector?: string;
  description?: string;
  targetPrNumber?: number | string;
  tabName?: string;
  filename?: string;
}

export function executeAction(action: Action): void {
  console.log("Executing action:", action);
  switch (action.type) {
    // New LLM Actions
    case "navigate":
      if (action.target_url) {
        return navigateToUrl(action.target_url);
      }
      break;
    case "open_pr":
      if (action.url) {
        return navigateToUrl(action.url);
      }
      break;
    case "highlight_dom":
      if (action.selector) {
        return highlightDom(action.selector);
      }
      break;
    case "scroll_to":
      if (action.selector) {
        return scrollToSelector(action.selector);
      }
      break;
    case "dom_query":
      console.log("LLM DOM Query:", action.selector, action.description);
      return; // Passive action

    // Legacy / Helper Actions (might still be useful if invoked locally)
    case "NAVIGATE_TO_PR":
      if (action.targetPrNumber !== undefined) {
        return navigateToPr(action.targetPrNumber);
      }
      break;
    case "NAVIGATE_TO_URL":
      if (action.url) {
        return navigateToUrl(action.url);
      }
      break;
    case "OPEN_TAB":
      if (action.tabName) {
        return openTab(action.tabName);
      }
      break;
    case "SCROLL_TO_DIFF_FOR_FILE":
      if (action.filename) {
        return scrollToFile(action.filename);
      }
      break;
    case "CLICK_ELEMENT":
      if (action.selector) {
        return clickElement(action.selector);
      }
      break;
    default:
      console.warn("Unknown action:", action);
  }
}

