const HAS_BLOCK = "HAS_BLOCK";
const HAS_NO_BLOCK = "HAS_NO_BLOCK";
const HAS_SUB_RULES = "HAS_SUB_RULES";

const AT_RULES = {
  "charset": HAS_NO_BLOCK,
  "import": HAS_NO_BLOCK,
  "namespace": HAS_NO_BLOCK,

  "counter-style": HAS_BLOCK,
  "font-face": HAS_BLOCK,
  "page": HAS_BLOCK,
  "viewport": HAS_BLOCK,

  "document": HAS_SUB_RULES,
  "font-feature-values": HAS_SUB_RULES,
  "keyframes": HAS_SUB_RULES,
  "media": HAS_SUB_RULES,
  "supports": HAS_SUB_RULES,
};

class CSSTokenizer {
  constructor(input) {
    this.lexer = getCSSLexer(input);
  }

  nextChunk() {
    let { tokens, stopText } = this._readUntil([";", "{", "}"]);
    if (!tokens) {
      return null;
    }

    tokens = this._trim(tokens);
    if (!tokens.length) {
      return this.nextChunk();
    }

    return this._parse(tokens, stopText) || { unknown: tokens };
  }

  _unknown(tokens) {
    return { unknown: tokens };
  }

  _parse(tokens, stopText) {
    switch (stopText) {
      case ";": {
        return this._parseAtRule(tokens) || this._parseProperty(tokens);
      }
      case "{": {
        return this._parseAtRule(tokens) || this._parseSelector(tokens);
      }
      case "}": {
        return this._parseProperty(tokens);
      }
    }
    return null;
  }

  _parseAtRule(tokens) {
    if (tokens[0].tokenType !== eCSSToken_AtKeyword) {
      return null;
    }

    const atrule = tokens.shift();
    const queries = tokens;
    return { atrule, queries };
  }

  _parseSelector(tokens) {
    return { selectors: tokens };
  }

  _parseProperty(tokens) {
    if (tokens.length < 3) {
      return null;
    }

    if (tokens[0].text === ":" || (tokens[1].text !== ":" && tokens[2].text !== ":")) {
      return null;
    }

    const property = tokens.shift();
    // Skip till ":"
    if (tokens.shift().tokenType === eCSSToken_Whitespace) {
      tokens.shift();
    }
    const values = this._trim(tokens);
    return { property, values };
  }

  _trim(tokens) {
    if (!tokens || !tokens.length) {
      return [];
    }

    while (true) {
      if (tokens.length && tokens[0].tokenType === eCSSToken_Whitespace) {
        tokens.shift();
      } else {
        break;
      }
    }

    while (true) {
      if (tokens.length && tokens[tokens.length - 1].tokenType === eCSSToken_Whitespace) {
        tokens.pop();
      } else {
        break;
      }
    }

    return tokens;
  }

  _nextToken() {
    while (true) {
      const token = this.lexer.nextToken();

      if (!token) {
        return null;
      }

      // Skip comment and whitespace
      if (token.tokenType !== eCSSToken_Comment) {
        return token;
      }
    }
  }

  _readUntil(stopTexts) {
    const tokens = [];

    while (true) {
      const token = this._nextToken();

      if (!token) {
        return {};
      }

      for (const stopText of stopTexts) {
        if (token.text === stopText) {
          return { tokens, stopText };
        }
      }

      token.lineNumber = this.lexer.lineNumber;
      token.columnNumber = this.lexer.columnNumber;

      tokens.push(token);
    }

    // Not found
    return {};
  }
}
