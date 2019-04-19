const BROWSERS = [
  "firefox",
  "chrome",
  "safari",
  "edge",
];

class BrowserSelector {
  constructor(port) {
    this.port = port;
    this.init();
    this.onClick = this.onClick.bind(this);
  }

  async init() {
    const browsersEl = document.getElementById("browsers");
    const browsers = getCompatData().browsers;

    const currentBrowser = await getCurrentBrowser();
    if (!browsers[currentBrowser.name]) {
      const { name, brandName, version } = currentBrowser;
      this.appendItem(browsersEl, name, brandName, version, "custom", true);
    } else if (!browsers[currentBrowser.name].releases[currentBrowser.version]) {
      const name = currentBrowser.name;
      const brandName = browsers[name].name;
      const version = currentBrowser.version;
      this.appendItem(browsersEl, name, brandName, version, "custom", true);
    }

    for (const name of BROWSERS) {
      const browser = browsers[name];
      const brandName = browser.name;
      for (const version in browser.releases) {
        const { status } = browser.releases[version];
        if (status === "current" || status === "beta" || status === "nightly") {
          const isCurrentBrowser =
            currentBrowser.brandName === brandName &&
            currentBrowser.version === parseFloat(version);
          this.appendItem(browsersEl, name, brandName, version, status, isCurrentBrowser);
        }
      }
    }
  }

  onClick({ target }) {
    if (target.classList.contains("selected")) {
      return;
    }

    document.querySelector(".selected").classList.remove("selected");
    target.classList.add("selected");

    const { browserName: name,
            browserBrandName: brandName,
            browserVersion: version } = target.dataset;
    this.port.postMessage({ name, brandName, version });
  }

  appendItem(ulEl, name, brandName, version, status, isCurrentBrowser) {
    const liEl = document.createElement("li");
    if (isCurrentBrowser) {
      liEl.classList.add("selected");
    }
    liEl.textContent = `${ name } ${ version } [${ status }]`;
    liEl.dataset.browserName = name;
    liEl.dataset.browserBrandName = brandName;
    liEl.dataset.browserVersion = version;
    liEl.addEventListener("click", this.onClick);
    ulEl.appendChild(liEl);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new BrowserSelector(browser.runtime.connect({ name: "browser-selector" }));
});
