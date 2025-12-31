chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy-to-wf",
    title: "Workflowy用にコピー",
    contexts: ["selection"]
  });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copy-to-wf") {
    chrome.tabs.sendMessage(tab.id, {type: "CW_DO_COPY"});
  }
});
