"use strict";

const COMPAT_DATA_URL = browser.runtime.getURL("compat-data.json");
const CONTENT_SCRIPT = "/content.js";

class Background {
  constructor() {
    this._compatData = new CompatData(COMPAT_DATA_URL);
  }

  async _update(tabId) {
    await browser.tabs.executeScript(tabId, { file: CONTENT_SCRIPT,
                                              runAt: "document_idle" });
    const styleSheets = await browser.tabs.sendMessage(tabId, {});
    for (const styleSheet of styleSheets) {
      await this._analyze(styleSheet);
    }
  }

  async _analyze(styleSheet) {
    const cssCompatData = await this._compatData.getCSSCompatData();
    const content = styleSheet.text || await this._fetch(styleSheet.href);
    const cssTokenizer = new CSSTokenizer(content);

    for (;;) {
      const rule = cssTokenizer.nextRule();
      if (!rule) {
        break;
      }
      console.log(rule);
    }
  }

  async _fetch(href) {
    const result = await fetch(href);
    return result.text();
  }

  start() {
    browser.tabs.onActivated.addListener(({ tabId }) => {
      this._update(tabId);
    });

    browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
      if (changeInfo.status !== "complete") {
        return;
      }

      const tab = await browser.tabs.get(tabId);
      if (!tab.active) {
        return;
      }

      this._update(tabId);
    });
  }
}

const background = new Background();
background.start();
