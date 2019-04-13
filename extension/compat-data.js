class CompatData {
  constructor(url) {
    this._url;
  }

  async _ensureCompatData() {
    if (!this._compatData) {
      const content = await fetch(this._url);
      this._compatData = content.json();
    }
  }

  async getCSSCompatData() {
    await this._ensureCompatData();
    return this._compatData.css;
  }
}
