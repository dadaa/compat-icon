const compatData = require("mdn-browser-compat-data")
const fs = require("fs")
const path = require("path")

const payload = {
  browsers: compatData.browsers,
  css: compatData.css
}

const content =
  `function getCompatData() { return ${ JSON.stringify(payload) }; }`;

fs.writeFile(
  path.resolve(
    __dirname,
    "..",
    "extension",
    "compat-data.js"
  ),
  content,
  err => {
    if (err) {
      console.error(err)
    }
  }
)
