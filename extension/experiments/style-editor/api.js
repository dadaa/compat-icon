"use strict";

async function getTargetForSelectedTab() {
  const { Services } =
    Components.utils.import("resource://gre/modules/Services.jsm");
  const { devtools } =
    Components.utils.import("resource://devtools/shared/Loader.jsm");
  const TargetFactory = devtools.TargetFactory;

  const browserWindow = Services.wm.getMostRecentWindow("navigator:browser");
  return await TargetFactory.forTab(browserWindow.gBrowser.selectedTab);
}

function getStyleSheetByContent(styleEditor, content) {
  for (const editor of styleEditor.editors) {
    if (editor._state.text === content) {
      return editor.styleSheet;
    }
  }
  return null;
}

this.styleEditor = class extends ExtensionAPI {
  getAPI() {
    return {
      experiments: {
        styleEditor: {
          async inspect(styleSheetHref, styleSheetText, lineNumber, columnNumber) {
            const { gDevTools } =
              Components.utils.import("resource://devtools/client/framework/gDevTools.jsm");

            const target = await getTargetForSelectedTab();
            const toolbox = await gDevTools.showToolbox(target, "styleeditor");
            const styleEditor = toolbox.getPanel("styleeditor").UI;
            const styleSheet =
              styleSheetHref || getStyleSheetByContent(styleEditor, styleSheetText);
            styleEditor.selectStyleSheet(styleSheet, lineNumber, columnNumber);
          },
        },
      },
    };
  }
}
