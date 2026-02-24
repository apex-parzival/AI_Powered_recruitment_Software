// TalentAI Co-pilot — Background Service Worker
// Minimal stub: handles install and activation events.

chrome.runtime.onInstalled.addListener(() => {
    console.log('[TalentAI] Extension installed. Open Google Meet to use the co-pilot panel.');
});
