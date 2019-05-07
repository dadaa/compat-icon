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
    if (this._targetBrowsers.length === 0) {
      browser.pageAction.setTitle({ tabId, title: "No target browsers" });
      browser.pageAction.setIcon({
        tabId,
        path: {
          [ICON_SIZE]: browser.runtime.getURL("images/icon.svg"),
        },
      });
      this._result = [];
      return;
    }

    await browser.tabs.executeScript(tabId, { file: CONTENT_SCRIPT,
                                              runAt: "document_idle" });
    const issueMap = new Map();
    const styleSheets = await browser.tabs.sendMessage(tabId, {});
    for (const styleSheet of styleSheets) {
      try {
        for (const { browser: browserObject,
                     property,
                     support,
                     lineNumber,
                     columnNumber } of (await this._analyze(styleSheet))) {

          if (!issueMap.has(browserObject)) {
            issueMap.set(browserObject, {
              browser: browserObject,
              issues: [],
              total: 0,
            });
          }

          const summary = issueMap.get(browserObject);
          summary.total += 1;
          if (support !== SUPPORT_STATE.SUPPORTED) {
            summary.issues.push(
              { property, support, styleSheet, lineNumber, columnNumber });
          }
        }
      } catch (e) {
        console.error(
          `Could not analyze ${ styleSheet.text || styleSheet.href } [${ e.message }]`);
      }
    }

    const result = [...issueMap.values()];

    // Find worst performing browser
    let targetBrowser;
    let targetCompatibilityRatio = Number.MAX_VALUE;
    for (const { browser: browserObject, issues, total } of result) {
      const ratio = (total - issues.length) / total;
      if (ratio < targetCompatibilityRatio) {
        targetBrowser = browserObject;
        targetCompatibilityRatio = ratio;
      }
    }

    const title = "Lowest compatibility browser: " +
                  `${ targetBrowser.brandName } ${ targetBrowser.version } ` +
                  ` (${ (targetCompatibilityRatio * 100).toFixed(2) }%)`;
    browser.pageAction.setTitle({ tabId, title });

    const iconIndentity = targetCompatibilityRatio > 0.9
                            ? "ok"
                            : targetCompatibilityRatio > 0.6
                              ? "warning"
                              : "error";
    const iconData = ICONS[iconIndentity];
    browser.pageAction.setIcon({
      tabId,
      path: {
        [ICON_SIZE]: browser.runtime.getURL(iconData.url),
      },
    });

    this._result = result;
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

          if (property === ("*")) {
            // Ignore all
            continue;
          }

          const { lineNumber, columnNumber } = chunk.property;
          for (const browser of this._targetBrowsers) {
            const support = this._getSupport(browser, property, compatData);
            result.push({ browser, property, support, lineNumber, columnNumber });
          }
        }
      } else if (chunk.unknown) {
        console.warn(chunk);
      }
    }

    return result;
  }

  _getSupport(browser, value, compatData) {
    if (!compatData[value]) {
      return SUPPORT_STATE.UNKNOWN;
    }

    switch (value) {
      case "align-content":
      case "align-items":
      case "align-self":
      case "justify-content":
      case "justify-items":
      case "justify-self": {
        compatData = compatData[value].flex_context;
        break;
      }
      default: {
        if (!compatData[value].__compat) {
          return SUPPORT_STATE.UNKNOWN;
        }

        compatData = compatData[value];
      }
    }

    const browserVersion = parseFloat(browser.version);
    const supportStates = compatData.__compat.support[browser.name] || [];
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

  _getDefaultTargetBrowsers() {
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

  async _updateTargetBrowsers() {
    const { targetBrowsers } = await browser.storage.local.get("targetBrowsers");
    this._targetBrowsers = targetBrowsers || this._getDefaultTargetBrowsers();
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
    await this._updateTargetBrowsers();

    browser.runtime.onConnect.addListener(port => {
      // Send result to the popup.
      port.postMessage(this._result);
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

    browser.storage.onChanged.addListener(async (changes, area) => {
      if (area === "local") {
        await this._updateTargetBrowsers();
      }
    });
  }
}

const background = new Background();
background.start();
