class Options {
  constructor() {
    this.onClick = this.onClick.bind(this);
  }

  async onClick() {
    const targetBrowsers = [];
    for (const inputEl of document.querySelectorAll("input:checked")) {
      const {
        browserName: name,
        browserBrandName: brandName,
        browserVersion: version,
        browserStatus: status
      } = inputEl.dataset;
      targetBrowsers.push({ name, brandName, version, status });
    }
    await browser.storage.local.set({ targetBrowsers });
  }

  async build() {
    const browsersEl = document.getElementById("browsers");
    const browsers = getCompatData().browsers;
    for (const name of ["firefox", "chrome", "safari", "edge"]) {
      const { name: brandName, releases } = browsers[name];

      const fieldsetEl = document.createElement("fieldset");
      const legendEl = document.createElement("legend");
      legendEl.textContent = brandName;
      const ulEl = document.createElement("ul");

      for (const version in releases) {
        const { status } = releases[version];

        if (status !== "current" && status !== "beta" && status !== "nightly") {
          continue;
        }

        const id = this.info2id(name, version);
        const liEl = document.createElement("li");
        const inputEl = document.createElement("input");
        const labelEl = document.createElement("label");

        inputEl.type = "checkbox";
        inputEl.id = id;
        inputEl.dataset.browserName = name;
        inputEl.dataset.browserBrandName = brandName;
        inputEl.dataset.browserVersion = version;
        inputEl.dataset.browserStatus = status;
        labelEl.setAttribute("for", id);
        labelEl.textContent = `${ version } (${ status })`;

        liEl.appendChild(inputEl);
        liEl.appendChild(labelEl);
        ulEl.appendChild(liEl);

        inputEl.addEventListener("click", this.onClick);
      }

      fieldsetEl.appendChild(legendEl);
      fieldsetEl.appendChild(ulEl);
      browsersEl.appendChild(fieldsetEl);
    }

    const { targetBrowsers } = await browser.storage.local.get("targetBrowsers");
    if (targetBrowsers) {
      for (const { name, version } of targetBrowsers) {
        const id = this.info2id(name, version);
        const inputEl = document.getElementById(id);
        inputEl.checked = true;
      }
    } else {
      for (const inputEl of document.querySelectorAll("input")) {
        inputEl.checked = true;
      }
    }
  }

  id2info(id) {
    const split = id.split("--");
    return {
      name: split[0],
      version: split[1],
    };
  }

  info2id(name, version) {
    return `${ name }--${ version }`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const options = new Options();
  options.build();
});
