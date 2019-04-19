async function getCurrentBrowser() {
  const browserInfo = await browser.runtime.getBrowserInfo();
  return { name: browserInfo.name.toLowerCase(),
           brandName: browserInfo.name,
           version: parseFloat(browserInfo.version) };
}
