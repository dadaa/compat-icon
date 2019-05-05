// Need to share
const SUPPORT_STATE = {
  SUPPORTED: "SUPPORTED",
  UNSUPPORTED: "UNSUPPORTED",
  UNKNOWN: "UNKNOWN",
};

class Popup {
  constructor() {
    this._onClickBrowser = this._onClickBrowser.bind(this);
    this._onClickProperty = this._onClickProperty.bind(this);
    this._onClickIssue = this._onClickIssue.bind(this);
  }

  _onClickBrowser({ browser, records }) {
    const issuesMap = new Map();
    for (const issue of this.getIssues(records)) {
      const property = issue.property;
      if (!issuesMap.has(property)) {
        issuesMap.set(property, []);
      }
      issuesMap.get(property).push(issue);
    }

    const items = [];
    for (const property of issuesMap.keys()) {
      const issues = issuesMap.get(property);
      items.push({
        className: "property",
        dataset: {
          property,
          issues,
        },
        onClick: this._onClickProperty,
        hasChild: true,
        labels: [`${ property } (${ issues.length })`],
      });
    }
    const header = `${ browser.brandName } ${ browser.version }`;
    this._listComponent.update(header, items);
  }

  _onClickProperty({ property, issues }) {
    const items = [];
    for (const issue of issues) {
      const styleSheetName = issue.styleSheet.href
                           ? issue.styleSheet.href.match(/\/([^\/]+$)/)[1]
                           : `Inline CSS #${ issue.styleSheet.index + 1 }`;
      items.push({
        className: "issue",
        dataset: {
          issue,
        },
        onClick: this._onClickIssue,
        labels: [
          (issue.styleSheet.href ? issue.styleSheet.href.match(/\/([^\/]+$)/)[1]
                                 : `Inline CSS #${ issue.styleSheet.index + 1 }`) +
          ` (${ issue.lineNumber }:${ issue.columnNumber })`,
          issue.support,
        ],
      });
    }
    this._listComponent.update(property, items);
  }

  async _onClickIssue({ issue }) {
    const { styleSheet, lineNumber, columnNumber } = issue;
    await browser.experiments.styleEditor.inspect(
      styleSheet.href || "", styleSheet.text || "", lineNumber, columnNumber);
  }

  build(result) {
    this._listComponent = new ListPanel(document.querySelector("main"));

    const items = [];
    for (const browser of result.keys()) {
      const records = result.get(browser);
      const {
        compatibleCount,
        compatibilityRatio,
        status,
        totalCount,
      } = this.getCompatibility(records);

      items.push({
        className: "browser",
        dataset: {
          browser,
          records,
        },
        onClick: this._onClickBrowser,
        hasChild: true,
        icon: `images/${ status }.svg`,
        labels: [
          `${ browser.brandName } ${ browser.version }`,
          `${ (compatibilityRatio * 100).toFixed(2) }%`,
          `(${ totalCount - compatibleCount } issues)`,
        ],
      });
    }
    this._listComponent.update(null, items);

    this._result = result;
  }

  getIssues(records) {
    return records.filter(r => r.support === SUPPORT_STATE.UNSUPPORTED ||
                               r.support === SUPPORT_STATE.UNKNOWN);
  }

  getCompatibility(records) {
    const totalCount = records.length;
    const compatibleCount =
      records.filter(r => r.support !== SUPPORT_STATE.UNSUPPORTED &&
                          r.support !== SUPPORT_STATE.UNKNOWN)
             .length;
    const compatibilityRatio = compatibleCount / totalCount;
    const status =
      compatibilityRatio > 0.9 ? "ok" : compatibilityRatio > 0.6 ? "warning" : "error";
    return { compatibleCount, compatibilityRatio, status, totalCount };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const port = browser.runtime.connect();
  port.onMessage.addListener(r => {
    const popup = new Popup();
    popup.build(r);
  });
});
