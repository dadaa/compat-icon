// Need to share
const SUPPORT_STATE = {
  SUPPORTED: "SUPPORTED",
  UNSUPPORTED: "UNSUPPORTED",
  UNKNOWN: "UNKNOWN",
};

class Popup {
  constructor() {
    this._onClickRuntime = this._onClickRuntime.bind(this);
    this._onClickProperty = this._onClickProperty.bind(this);
    this._onClickIssue = this._onClickIssue.bind(this);
    this._onClickOpenRuntime = this._onClickOpenRuntime.bind(this);
  }

  async _onClickOpenRuntime({ target }) {
    const { runtimePath: path } = target.dataset;
    const launchInfo = { path, url: this._url };
    browser.runtime.sendNativeMessage("compat_icon_launcher", launchInfo);
  }

  _onClickRuntime({ runtime, issuesInRuntime }) {
    const issuesMap = new Map();
    for (const issue of issuesInRuntime) {
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

    const label = `${ runtime.brandName } ${ runtime.version }`;

    const actionEl = document.createElement("button");
    actionEl.classList.add("action");
    actionEl.classList.add("open");
    actionEl.textContent = "OPEN";
    actionEl.disabled = !runtime.path;
    actionEl.title =
      !runtime.path
        ? "Execution path is not found. (You can setup in the pref on about:addons)"
        : `Open ${ label }`;
    actionEl.dataset.runtimePath = runtime.path;
    actionEl.addEventListener("click", this._onClickOpenRuntime);

    this._listComponent.update({ label, actionEl }, items);
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

    const label = property;

    const link = `https://developer.mozilla.org/docs/Web/CSS/${ property }`;
    const actionEl = document.createElement("a");
    actionEl.classList.add("action");
    actionEl.classList.add("help");
    actionEl.href = link;
    actionEl.title = link;
    const imgEl = document.createElement("img");
    imgEl.src = "images/help.svg";
    actionEl.appendChild(imgEl);

    this._listComponent.update({ label, actionEl }, items);
  }

  async _onClickIssue({ issue }) {
    const { styleSheet, lineNumber, columnNumber } = issue;
    await browser.experiments.styleEditor.inspect(
      styleSheet.href || "", styleSheet.text || "", lineNumber, columnNumber);
  }

  build(url, result) {
    this._listComponent = new ListPanel(document.querySelector("main"));

    const items = [];
    for (const { runtime, issues: issuesInRuntime, total } of result) {
      const { compatibilityRatio, status } =
        this.getCompatibility(issuesInRuntime, total);

      items.push({
        className: "runtime",
        dataset: {
          runtime,
          issuesInRuntime,
        },
        onClick: this._onClickRuntime,
        hasChild: true,
        icon: `images/${ status }.svg`,
        labels: [
          `${ runtime.brandName } ${ runtime.version }`,
          `${ (compatibilityRatio * 100).toFixed(2) }%`,
          `(${ issuesInRuntime.length } issues)`,
        ],
      });
    }
    this._listComponent.update(null, items);

    this._url = url;
    this._result = result;
  }

  getCompatibility(issues, total) {
    const compatibilityRatio = (total - issues.length) / total;
    const status =
      compatibilityRatio > 0.9 ? "ok" : compatibilityRatio > 0.6 ? "warning" : "error";
    return { compatibilityRatio, status };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const port = browser.runtime.connect();
  port.onMessage.addListener(({ url, result }) => {
    const popup = new Popup();
    popup.build(url, result);
  });
});
