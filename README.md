# Install
## Clone
Clone this repository and change current directory to the extracted directory.
## Prepare MDN browser compat data
Please run following commands that makes `./extension/compat-data.js` which includes MDN browser compat data.
```
npm i
npm run-script build-data
```
## Install as a temporary WebExtension
1. Open `about:debugging` page
2. Click `Load temporary add-on` button
3. Select `./extension/manifest.json`
