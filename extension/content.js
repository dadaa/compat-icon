"use strict";

browser.runtime.onMessage.addListener(async () => {
  const styleSheets = [];

  for (let i = 0; i < document.styleSheets.length; i++) {
    const styleSheet = document.styleSheets[i];
    if (styleSheet.href) {
      styleSheets.push({ href: styleSheet.href });
    } else {
      styleSheets.push({ text: styleSheet.ownerNode.textContent, index: i });
    }
  }

  return styleSheets;
});
