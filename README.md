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

# Setup to enable launching other browsers
In this extension, launches other browsers using [Native messaging](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Native_messaging). To run the `Native messaging`, needs to locate native message manifesto to proper directory, and needs to specify proper execution file path in the manifesto.

## Locate native message manifesto to directory
The manifesto is `extension-native/compat_icon_launcher.json`. Please copy the file to proper directory (e.g. `~/Library/Application Support/Mozilla/NativeMessagingHosts/compat_icon_launcher.json` for MAC). Regarding to the directory, please refer this document.
https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Native_manifests#Manifest_location

## Specify the execution file path
Please specify the absolute file path which points `extension-native/launcher.py` in `path` field of the manifesto file.
e.g.
```
{
  "name": "compat_icon_launcher",
  "path": "/Users/xxxxx/compat-icon/extension-native/launcher.py",
  "type": "stdio",
  "allowed_extensions": [ "compat-icon@firefox-dev.tools" ]
}
```
