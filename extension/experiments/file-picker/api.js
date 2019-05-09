"use strict";

this.filePicker = class extends ExtensionAPI {
  getAPI() {
    return {
      experiments: {
        filePicker: {
          async pick(title) {
            const { classes: Cc, interfaces: Ci, utils: utils } = Components;
            const { Services } = Cu.import("resource://gre/modules/Services.jsm");

            const fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
            const browserWindow = Services.wm.getMostRecentWindow("navigator:browser");
            fp.init(browserWindow, title, Ci.nsIFilePicker.modeOpen);

            return new Promise(resolve => {
              fp.open(r => {
                const result =
                  r === Ci.nsIFilePicker.returnCancel ? null : fp.file.path;
                resolve(result);
              });
            });

          },
        },
      },
    };
  }
}
