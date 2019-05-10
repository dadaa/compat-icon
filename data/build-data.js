'use strict';

const compatData = require("mdn-browser-compat-data")
const fs = require("fs")
const path = require("path")

extractPropertyAliases(compatData.css.properties);

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

function extractPropertyAliases(propertyMap) {
  const aliases = [];
  for (let property in propertyMap) {
    const compatData = propertyMap[property]
    recursiveExtractPropertyAliases(aliases, property, compatData);
  }

  for (const { alias, context, runtime,
               version_added, version_removed, flags } of aliases) {

    if (!propertyMap[alias]) {
      propertyMap[alias] = {}
    }

    let compatData;
    if (context) {
      if (!propertyMap[alias][context]) {
        propertyMap[alias][context] = {};
      }
      compatData = propertyMap[alias][context];
    } else {
      if (!propertyMap[alias]) {
        propertyMap[alias] = {};
      }
      compatData = propertyMap[alias];
    }

    if (!compatData.__compat) {
      compatData.__compat = {};
    }

    if (!compatData.__compat.support) {
      compatData.__compat.support = {};
    }

    const support = compatData.__compat.support;
    if (!support[runtime]) {
      support[runtime] = [];
    } else if (!Array.isArray(support[runtime])) {
      support[runtime] = [support[runtime]];
    }

    const supportList = support[runtime];
    supportList.push({
      version_added, version_removed, flags,
    });
  }
}

function recursiveExtractPropertyAliases(aliases, property, compatData, context) {
  if (compatData.__compat) {
    for (let runtime in compatData.__compat.support) {
      const supportStates = compatData.__compat.support[runtime] || [];
      for (const { alternative_name, prefix, version_added, version_removed, flags }
            of Array.isArray(supportStates) ? supportStates : [supportStates]) {
        if (!prefix && ! alternative_name) {
          continue;
        }

        const alias = alternative_name || prefix + property;
        aliases.push({
          alias, context, runtime, version_added, version_removed, flags,
        });
      }
    }

    return;
  }

  for (let field in compatData) {
    if (field.endsWith("_context")) {
      recursiveExtractPropertyAliases(aliases, property, compatData[field], field);
    }
  }
}
