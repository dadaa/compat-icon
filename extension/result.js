// Need to share
const SUPPORT_STATE = {
  SUPPORTED: "SUPPORTED",
  UNSUPPORTED: "UNSUPPORTED",
  UNKNOWN: "UNKNOWN",
};

class Result {
  constructor() {
    this._onClick = this._onClick.bind(this);
  }

  _createKey(issue) {
    return `${ issue.property } ${ issue.support }`;
  }

  _extractKey(key) {
    const split = key.split(" ");
    return { property: split[0], support: split[1] };
  }

  _onClick({ target }) {
    const browserEl = target.closest(".browser");
    if (browserEl.querySelector(".issues")) {
      browserEl.querySelector(".issues").remove();
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
      const count = issuesMap.has(key) ? issuesMap.get(key) + 1 : 1;
      issuesMap.set(key, count);
    }

    const issuesEl = document.createElement("ul");
    issuesEl.classList.add("issues");
    for (const key of issuesMap.keys()) {
      const count = issuesMap.get(key);
      const issue = this._extractKey(key);
      const issueEl = document.createElement("li");
      issueEl.classList.add("issue");
      const aEl = document.createElement("a");
      aEl.href = `https://developer.mozilla.org/docs/Web/CSS/${ issue.property }`;
      aEl.textContent = `${issue.property} ${ issue.support } (${ count })`;
      issueEl.appendChild(aEl);
      issuesEl.appendChild(issueEl);
    }
    browserEl.appendChild(issuesEl);
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
      headerEl.addEventListener("click", this._onClick);
    }

    this._result = result;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const port = browser.runtime.connect();
  port.onMessage.addListener(r => {
    const result = new Result();
    result.build(r);
  });
});
