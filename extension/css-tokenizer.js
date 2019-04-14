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
    this.input = input;
    this.lexer = getCSSLexer(input);
  }

  nextRule() {
    const firstToken = this._skipWhitespace();
    if (!firstToken) {
      return null;
    }

    if (firstToken.text === "}") {
      // end of rule block
      return null;
    }

    const atRuleName =
      firstToken.tokenType === eCSSToken_AtKeyword ? firstToken.text : null;
    if (!atRuleName) {
      const { tokens } = this._readUntil(["{"]);
      tokens.unshift(firstToken);
      const selectors = this._toSplitString(tokens);
      const declarations = this._getDeclarationBlock();
      return { declarations, selectors };
    }

    const atRuleFeature = AT_RULES[atRuleName];
    if (atRuleFeature === HAS_NO_BLOCK) {
      const { tokens } = this._readUntil([";"]);
      const atRuleKeywords = this._toSplitString(tokens);
      return { atRuleName, atRuleKeywords };
    }

    // HAS_BLOCK or HAS_SUB_RULES case
    const { tokens } = this._readUntil(["{"]);
    const atRuleKeywords = this._toSplitString(tokens);

    if (atRuleFeature === HAS_SUB_RULES) {
      const subRules = [];
      while (true) {
        // Get nested sub rule.
        const subRule = this.nextRule();
        if (!subRule) {
          break;
        }
        subRules.push(subRule);
      }
      return { atRuleName, atRuleKeywords, subRules };
    }

    // HAS_BLOCK case
    // If we did not get the feature, try to get the block as default
    const declarations = this._getDeclarationBlock();
    return { atRuleName, atRuleKeywords, declarations };
  }

  _getDeclarationBlock() {
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

    return declarations;
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

  _skipWhitespace(tokens) {
    while (true) {
      const token = this._nextToken();
      if (!token) {
        return null;
      }

      if (token.tokenType !== eCSSToken_Whitespace) {
        return token;
      }
    }

    return null;
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

  _toSplitString(tokens) {
    return this._toString(tokens).split(/\s+/);
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
