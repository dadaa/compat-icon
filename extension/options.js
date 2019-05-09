class Options {
  constructor() {
    this._onClickInput = this._onClickInput.bind(this);
    this._onClickSettings = this._onClickSettings.bind(this);
  }

  async _onClickInput() {
    const targetRuntimes = [];
    for (const inputEl of document.querySelectorAll("input:checked")) {
      const {
        runtimeName: name,
        runtimeBrandName: brandName,
        runtimeVersion: version,
        runtimeStatus: status,
        runtimePath: path,
      } = inputEl.dataset;
      targetRuntimes.push({ name, brandName, version, status, path });
    }
    await browser.storage.local.set({ targetRuntimes });
  }

  async _onClickSettings({ target }) {
    const path = await browser.experiments.filePicker.pick("Choose the execution file");
    if (!path) {
      return;
    }

    const { settingId } = target.dataset;
    const inputEl = document.getElementById(settingId);
    inputEl.dataset.runtimePath = path;
    this._updatePath(inputEl, path);

    // Update the storage
    this._onClickInput();
  }

  async build() {
    const runtimesEl = document.getElementById("runtimes");
    const runtimes = getCompatData().browsers;
    for (const name of ["firefox", "chrome", "safari", "edge"]) {
      const { name: brandName, releases } = runtimes[name];

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
        inputEl.dataset.runtimeName = name;
        inputEl.dataset.runtimeBrandName = brandName;
        inputEl.dataset.runtimeVersion = version;
        inputEl.dataset.runtimeStatus = status;
        inputEl.dataset.runtimePath = "";
        labelEl.setAttribute("for", id);
        labelEl.textContent = `${ version } (${ status })`;
        liEl.appendChild(inputEl);
        liEl.appendChild(labelEl);

        const locationEl = document.createElement("label");
        locationEl.classList.add("location");
        const settingsEl = document.createElement("button");
        settingsEl.classList.add("settings");
        settingsEl.dataset.settingId = id;
        liEl.appendChild(locationEl);
        liEl.appendChild(settingsEl);

        ulEl.appendChild(liEl);

        inputEl.addEventListener("click", this._onClickInput);
        settingsEl.addEventListener("click", this._onClickSettings);
      }

      fieldsetEl.appendChild(legendEl);
      fieldsetEl.appendChild(ulEl);
      runtimesEl.appendChild(fieldsetEl);
    }

    const { targetRuntimes } = await browser.storage.local.get("targetRuntimes");
    if (targetRuntimes) {
      for (const { name, version, path } of targetRuntimes) {
        const id = this.info2id(name, version);
        const inputEl = document.getElementById(id);
        inputEl.checked = true;
        this._updatePath(inputEl, path);
      }
    } else {
      for (const inputEl of document.querySelectorAll("input")) {
        inputEl.checked = true;
      }
    }
  }

  _updatePath(inputEl, path) {
    inputEl.dataset.runtimePath = path;
    const labelEl = inputEl.closest("li").querySelector(".location");
    labelEl.textContent = path;
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
