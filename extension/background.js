"use strict";

const COMPAT_DATA_URL = browser.runtime.getURL("compat-data.json");
const CONTENT_SCRIPT = "/content.js";

const SUPPORT_STATE = {
  SUPPORTED: "SUPPORTED",
  UNSUPPORTED: "UNSUPPORTED",
  UNKNOWN: "UNKNOWN",
};

const ICON_SIZE = 16;
const ICONS = {
  error: {
    url: "images/error.svg",
  },
  ok: {
    url: "images/ok.svg",
  },
  warning: {
    url: "images/warning.svg",
  },
};

class Background {
  async _update(tabId) {
    const result = [];

    await browser.tabs.executeScript(tabId, { file: CONTENT_SCRIPT,
                                              runAt: "document_idle" });
    const styleSheets = await browser.tabs.sendMessage(tabId, {});
    for (const styleSheet of styleSheets) {
      try {
        const r = await this._analyze(styleSheet);
        result.push(...r);
      } catch (e) {
        console.error(
          `Could not analyze ${ styleSheet.text || styleSheet.href } [${ e.message }]`);
      }
    }

    // Update title
    const compatibleCount =
      result.filter(r => r.support !== SUPPORT_STATE.UNSUPPORTED &&
                         r.support !== SUPPORT_STATE.UNKNOWN)
            .length;
    const compatibilityRatio = compatibleCount / result.length;
    const title = `Compatibility Ratio: ${ (compatibilityRatio * 100).toFixed(2) }%`;
    browser.pageAction.setTitle({ tabId, title });

    // Update icon
    const iconIndentity =
      compatibilityRatio > 0.9 ? "ok" : compatibilityRatio > 0.6 ? "warning" : "error";
    const iconData = ICONS[iconIndentity];
    browser.pageAction.setIcon({
      tabId,
      path: {
        [ICON_SIZE]: browser.runtime.getURL(iconData.url),
      },
    });

    this.result = result;
  }

  async _analyze(styleSheet) {
    const cssCompatData = this._compatData.css;
    const content = styleSheet.text || await this._fetch(styleSheet.href);
    const cssTokenizer = new CSSTokenizer(content);

    const result = [];

    let parent;
    for (;;) {
      const chunk = cssTokenizer.nextChunk();
      if (!chunk) {
        break;
      }

      if (chunk.atrule) {
        parent = chunk;
      } else if (chunk.selectors) {
        parent = chunk;
      } else if (chunk.property) {
        if (!parent) {
          console.warn("No parent for this property:"+chunk.property.text);
          continue;
        }

        const isInCSSDeclarationBlock = parent.selectors ||
                                        parent.atrule.text === "media" ||
                                        parent.atrule.text === "page";

        if (isInCSSDeclarationBlock) {
          const compatData = cssCompatData.properties;
          const property = chunk.property.text;

          if (property.startsWith("--")) {
            // Ignore CSS variable
            continue;
          }

          for (const browser of this._targetBrowsers) {
            const support = this._getSupport(browser, property, compatData);
            result.push({ browser, property, support });
          }
        }
      } else if (chunk.unknown) {
        console.warn(chunk);
      }
    }

    return result;
  }

  _getSupport(browser, value, compatData) {
    if (!compatData[value] || !compatData[value].__compat) {
      return SUPPORT_STATE.UNKNOWN;
    }

    const browserVersion = parseFloat(browser.version);
    const supportStates = compatData[value].__compat.support[browser.name] || [];
    for (const state of Array.isArray(supportStates) ? supportStates : [supportStates]) {
      // Ignore things that have prefix or flags
      if (state.prefix || state.flags) {
        continue;
      }

      const addedVersion = this._asFloatVersion(state.version_added);
      const removedVersion = this._asFloatVersion(state.version_removed);
      if (addedVersion <= browserVersion && browserVersion < removedVersion) {
        return SUPPORT_STATE.SUPPORTED;
      }
    }

    return SUPPORT_STATE.UNSUPPORTED;
  }

  _getTargetBrowsers() {
    const targetBrowsers = [];

    for (const name of ["firefox", "chrome", "safari", "edge"]) {
      const browser = this._compatData.browsers[name];
      const brandName = browser.name;
      for (const version in browser.releases) {
        const { status } = browser.releases[version];
        if (status === "current" || status === "beta" || status === "nightly") {
          targetBrowsers.push({ name, brandName, status, version });
        }
      }
    }

    return targetBrowsers;
  }

  _asFloatVersion(version = false) {
    if (version === true) {
      return 0;
    }
    return version === false ? Number.MAX_VALUE : parseFloat(version);
  }

  async _fetch(href) {
    const result = await fetch(href);
    return result.text();
  }

  async start() {
    this._compatData = getCompatData();
    this._targetBrowsers = this._getTargetBrowsers();

    browser.runtime.onConnect.addListener(port => {
      // Send result to the popup.
      port.postMessage(this.result);
    });

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
