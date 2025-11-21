# GitHub AI Assistant

A Chrome Extension (Manifest V3) that adds an AI chat sidebar to GitHub pages and can navigate/modify the GitHub DOM based on AI commands.

## Prerequisites

- Node.js (for the mock backend)
- Google Chrome

## Installation

### 1. Start the Backend Mock

The extension communicates with a local backend server to process chat messages.

```bash
cd backend-mock
npm install
npm start
```

The server will run on `http://localhost:3000`.

### 2. Load the Extension

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `github-ai-assistant` directory (the root folder of this project, NOT `backend-mock`).

## Usage

1. Navigate to any GitHub repository (e.g., `https://github.com/facebook/react`).
2. You should see the **GitHub AI** sidebar on the bottom right.
3. Click the header to expand it if collapsed.
4. Type commands in the input box.

### Supported Commands (Mocked)

- **"Go to PR #123"**: Navigates to the specified PR.
- **"Show largest diff"** or **"Find largest diff"**: Finds the open PR with the most changes and navigates to it.
- **"Highlight largest diff"**: Highlights the PR row in the list view (must be on `/pulls` page).
- **"Show most commented"**: Navigates to the PR with the most comments.
- **"Show files"**: Opens the "Files changed" tab on a PR page.
- **"Expand diffs"**: Expands all hidden diff sections on a PR page.
- **"Scroll to [filename]"**: Scrolls to a specific file in the diff view.

## Project Structure

- `/manifest.json`: Extension configuration.
- `/contentScript.js`: Injects the sidebar and orchestrates logic.
- `/sidebar/`: Contains the UI (HTML/CSS) and logic (JS) for the chat interface.
- `/utils/extractGithubContext.js`: Scrapes data from the current page.
- `/actions/`: Contains DOM manipulation scripts and the action router.
- `/backend-mock/`: A simple Node.js Express server acting as the AI brain.
