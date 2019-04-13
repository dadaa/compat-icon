class CSSTokenizer {
  constructor(input) {
    this.input = input;
    this.lexer = getCSSLexer(input);
  }

  nextRule() {
    const { tokens: selectorOrAtRuleTokens } = this._readUntil(["{"]);
    if (!selectorOrAtRuleTokens) {
      return null;
    }

    const { atRuleName, atRuleKeywords, selectors } =
      this._parseSelectorOrAtRule(selectorOrAtRuleTokens);

    if (atRuleName === "keyframes" || atRuleName === "media") {
      const childRules = [];
      while (true) {
        const childRule = this.nextRule();
        if (!childRule) {
          break;
        }
        childRules.push(childRule);
      }
      return { atRuleName, atRuleKeywords, childRules };
    }

    const declarations = {};
    while (true) {
      const { tokens: propertyTokens } = this._readUntil([":", "}"]);
      const property = this._toString(propertyTokens);
      if (!property) {
        break;
      }

      const { tokens: valueTokens, stopText } = this._readUntil([";", "}"]);
      const value = this._toString(valueTokens);
      declarations[property] = value;

      if (stopText === "}") {
        break;
      }
    }

    return atRuleName ? { atRuleName, atRuleKeywords, declarations}
                      : { selectors, declarations };
  }

  _nextToken() {
    while (true) {
      const token = this.lexer.nextToken();

      if (!token) {
        return null;
      }

      // Skip comment
      if (token.tokenType !== eCSSToken_Comment) {
        return token;
      }
    }
  }

  _parseSelectorOrAtRule(tokens) {
    let firstToken = null;

    while (true) {
      const token = tokens.shift();
      if (token.tokenType !== eCSSToken_Whitespace) {
        firstToken = token;
        break;
      }
    }

    const isAtRule = firstToken.tokenType === eCSSToken_AtKeyword;
    if (isAtRule) {
      return {
        atRuleName: firstToken.text,
        atRuleKeywords: this._toString(tokens).split(" "),
      };
    } else {
      tokens.unshift(firstToken);
      return { selectors: this._toString(tokens).split(" ") };
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

      tokens.push(token);
    }

    // Not found
    return {};
  }

  _toString(tokens) {
    if (!tokens || !tokens.length) {
      return "";
    }
    const first = tokens[0];
    const last = tokens[tokens.length - 1];
    return this.input.substring(first.startOffset, last.endOffset).trim();
  }
}
