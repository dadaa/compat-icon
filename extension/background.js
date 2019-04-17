"use strict";

const COMPAT_DATA_URL = browser.runtime.getURL("compat-data.json");
const CONTENT_SCRIPT = "/content.js";

class Background {
  async _update(tabId) {
    await browser.tabs.executeScript(tabId, { file: CONTENT_SCRIPT,
                                              runAt: "document_idle" });
    const styleSheets = await browser.tabs.sendMessage(tabId, {});
    for (const styleSheet of styleSheets) {
      await this._analyze(styleSheet);
    }
  }

  async _analyze(styleSheet) {
    const targetBrowser = "firefox";
    const targetBrowserVersion = "68";

    const cssCompatData = getCompatData().css; // from compat-data.js
    const content = styleSheet.text || await this._fetch(styleSheet.href);
    const cssTokenizer = new CSSTokenizer(content);

    const result = [];

    let currentCompatData;
    let type;
    for (;;) {
      const chunk = cssTokenizer.nextChunk();
      if (!chunk) {
        break;
      }

      if (chunk.atrule) {
        const atrule = chunk.atrule.text;
        const atruleCompatData = cssCompatData["at-rules"];
        const support = this.getSupport(atruleCompatData, targetBrowser, atrule);
        result.push({ atrule, support });
        currentCompatData = atruleCompatData[atrule];
        type = "atrule";
      } else if (chunk.selectors) {
        currentCompatData = cssCompatData["properties"];
        type = "css";
      } else if (chunk.property) {
        const property = chunk.property.text;
        const support = this.getSupport(currentCompatData, targetBrowser, property);
        result.push({ type, property, support });
      }
    }

    console.log(result);
  }

  getSupport(compatData, browser, value) {
    return compatData &&
           compatData[value] &&
           compatData[value].__compat
             ? compatData[value].__compat.support[browser]
             : false;
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
