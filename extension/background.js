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
    color: "#d70022",
  },
  ok: {
    url: "images/ok.svg",
    color: "#12bc00",
  },
  warning: {
    url: "images/warning.svg",
    color: "#be9b00",
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
    const title = `Compatibility Ratio: ${ (compatibilityRatio * 100).toFixed(2) }% ` +
                  `(${ this._targetBrowser.brandName } ${ this._targetBrowser.version })`;
    browser.pageAction.setTitle({ tabId, title });

    // Update icon
    const iconIndentity =
      compatibilityRatio > 0.9 ? "ok" : compatibilityRatio > 0.6 ? "warning" : "error";
    const iconData = ICONS[iconIndentity];
    const iconImage = new Image();
    await new Promise(resolve => {
      iconImage.onload = resolve;
      iconImage.src = browser.runtime.getURL(iconData.url);
    });
    const canvas = document.createElement("canvas");
    canvas.setAttribute("width", ICON_SIZE);
    canvas.setAttribute("height", ICON_SIZE);
    const context = canvas.getContext("2d");
    context.drawImage(iconImage, 0, 0, ICON_SIZE, ICON_SIZE);
    context.globalCompositeOperation = "source-in";
    context.fillStyle = iconData.color;
    context.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
    browser.pageAction.setIcon({
      tabId,
      path: {
        [ICON_SIZE]: canvas.toDataURL(),
      },
    });
  }

  async _analyze(styleSheet) {
    const cssCompatData = this.compatData.css;
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
          const support = this.getSupport(this._targetBrowser, property, compatData);
          result.push({ property, support });
        }
      } else if (chunk.unknown) {
        console.warn(chunk);
      }
    }

    return result;
  }

  getSupport(browser, value, compatData) {
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

      const addedVersion = this.asFloatVersion(state.version_added);
      const removedVersion = this.asFloatVersion(state.version_removed);
      if (addedVersion <= browserVersion && browserVersion < removedVersion) {
        return SUPPORT_STATE.SUPPORTED;
      }
    }

    return SUPPORT_STATE.UNSUPPORTED;
  }

  asFloatVersion(version = false) {
    if (version === true) {
      return 0;
    }
    return version === false ? Number.MAX_VALUE : parseFloat(version);
  }

  async _fetch(href) {
    const result = await fetch(href);
    return result.text();
  }

  async _updateTargetBrowser(targetBrowser) {
    this._targetBrowser = targetBrowser;

    const tabs = await browser.tabs.query({ currentWindow: true, active: true });
    if (tabs.length !== 1) {
      return;
    }
    this._update(tabs[0].id);
  }

  async start() {
    this.compatData = getCompatData();
    this._targetBrowser = await getCurrentBrowser();

    browser.runtime.onConnect.addListener(port => {
      port.onMessage.addListener(targetBrowser => {
        this._updateTargetBrowser(targetBrowser);
      });
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
