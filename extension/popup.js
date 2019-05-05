// Need to share
const SUPPORT_STATE = {
  SUPPORTED: "SUPPORTED",
  UNSUPPORTED: "UNSUPPORTED",
  UNKNOWN: "UNKNOWN",
};

class Popup {
  constructor() {
    this._onClickBrowser = this._onClickBrowser.bind(this);
    this._onClickIssueCategory = this._onClickIssueCategory.bind(this);
    this._onClickIssue = this._onClickIssue.bind(this);
  }

  _createKey(issue) {
    return `${ issue.property } ${ issue.support }`;
  }

  _extractKey(key) {
    const split = key.split(" ");
    return { property: split[0], support: split[1] };
  }

  _onClickBrowser({ target }) {
    const browserEl = target.closest(".browser");
    if (browserEl.querySelector(".issue-categories")) {
      browserEl.querySelector(".issue-categories").remove();
      return;
    }

    const { browserName, browserVersion } = target.dataset;
    const browser =
      [...this._result.keys()].find(b => b.name === browserName &&
                                         b.version === browserVersion);
    const issues =
      this._result.get(browser).filter(r => r.support === SUPPORT_STATE.UNSUPPORTED ||
                                            r.support === SUPPORT_STATE.UNKNOWN);

    const issuesMap = new Map();
    for (const issue of issues) {
      const key = this._createKey(issue);
      const list = issuesMap.has(key) ? issuesMap.get(key) : [];
      list.push(issue);
      issuesMap.set(key, list);
    }

    const issueCategoriesEl = document.createElement("ul");
    issueCategoriesEl.classList.add("issue-categories");
    for (const key of issuesMap.keys()) {
      const count = issuesMap.get(key).length;
      const issue = this._extractKey(key);
      const issueCategoryEl = document.createElement("li");
      issueCategoryEl.classList.add("issue-category");
      const issueCategoryHeaderEl = document.createElement("a");
      issueCategoryHeaderEl.textContent =
        `${issue.property} ${ issue.support } (${ count })`;
      issueCategoryHeaderEl.dataset.browserName = browser.name;
      issueCategoryHeaderEl.dataset.browserVersion = browser.version;
      issueCategoryHeaderEl.dataset.issueProperty = issue.property;
      issueCategoryHeaderEl.dataset.issueSupport = issue.support;
      issueCategoryEl.appendChild(issueCategoryHeaderEl);
      issueCategoriesEl.appendChild(issueCategoryEl);

      issueCategoryHeaderEl.addEventListener("click", this._onClickIssueCategory);
    }
    browserEl.appendChild(issueCategoriesEl);
  }

  _onClickIssueCategory({ target }) {
    const issueCategoryEl = target.closest(".issue-category");
    if (issueCategoryEl.querySelector(".issues")) {
      issueCategoryEl.querySelector(".issues").remove();
      return;
    }

    const { browserName, browserVersion, issueProperty, issueSupport } = target.dataset;
    const browser =
      [...this._result.keys()].find(b => b.name === browserName &&
                                         b.version === browserVersion);
    const issues =
      this._result.get(browser).filter(r => r.property === issueProperty &&
                                            r.support === issueSupport);
    const issuesEl = document.createElement("ul");
    issuesEl.classList.add("issues");
    for (const issue of issues) {
      const issueEl = document.createElement("li");
      issueEl.classList.add("issue");
      const contentEl = document.createElement("a");
      const name = issue.styleSheet.href
                     ? issue.styleSheet.href.match(/\/([^\/]+$)/)[1]
                     : `Inline CSS #${ issue.styleSheet.index + 1 }`
      contentEl.textContent = `${ name } (${ issue.lineNumber }:${ issue.columnNumber })`;
      contentEl.dataset.styleSheetHref = issue.styleSheet.href || "";
      contentEl.dataset.styleSheetText = issue.styleSheet.text || "";
      contentEl.dataset.lineNumber = issue.lineNumber;
      contentEl.dataset.columnNumber = issue.columnNumber;
      issueEl.appendChild(contentEl);
      issuesEl.appendChild(issueEl);

      contentEl.addEventListener("click", this._onClickIssue);
    }
    issueCategoryEl.appendChild(issuesEl);
  }

  async _onClickIssue({ target }) {
    const { styleSheetHref, styleSheetText, lineNumber, columnNumber } = target.dataset;
    await browser.experiments.styleEditor.inspect(
      styleSheetHref, styleSheetText, parseInt(lineNumber), parseInt(columnNumber));
  }

  build(result) {
    const browsersEl = document.getElementById("browsers");

    for (const browser of result.keys()) {
      const records = result.get(browser);
      const compatibleCount =
        records.filter(r => r.support !== SUPPORT_STATE.UNSUPPORTED &&
                            r.support !== SUPPORT_STATE.UNKNOWN)
               .length;
      const compatibilityRatio = compatibleCount / records.length;

      const iconIndentity =
        compatibilityRatio > 0.9 ? "ok" : compatibilityRatio > 0.6 ? "warning" : "error";
      const browserEl = document.createElement("li");
      browserEl.classList.add("browser");
      const headerEl = document.createElement("a");
      headerEl.classList.add("header");
      headerEl.classList.add(iconIndentity);
      const browserLabelEl = document.createElement("label");
      const ratioLabelEl = document.createElement("label");
      const issueLabelEl = document.createElement("label");
      browserLabelEl.textContent =
        `${ browser.brandName } ${ browser.version } (${ browser.status })`;
      ratioLabelEl.textContent = `${ (compatibilityRatio * 100).toFixed(2) }%`;
      issueLabelEl.textContent = `(${ records.length - compatibleCount } issues)`;
      headerEl.appendChild(browserLabelEl);
      headerEl.appendChild(ratioLabelEl);
      headerEl.appendChild(issueLabelEl);
      browserEl.appendChild(headerEl);
      browsersEl.appendChild(browserEl);

      headerEl.dataset.browserName = browser.name;
      headerEl.dataset.browserVersion = browser.version;
      headerEl.addEventListener("click", this._onClickBrowser);
    }

    this._result = result;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const port = browser.runtime.connect();
  port.onMessage.addListener(r => {
    const popup = new Popup();
    popup.build(r);
  });
});
