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

  nextRule(isSubRule = false) {
    const firstToken = this._nextToken();
    if (!firstToken) {
      return null;
    }

    if (firstToken.text === "}") {
      // end of rule block
      return isSubRule ? null : this.nextRule();
    }

    const atRuleName =
      firstToken.tokenType === eCSSToken_AtKeyword ? firstToken.text : null;
    if (!atRuleName) {
      const { tokens: selectors } = this._readUntil(["{"], true);
      selectors.unshift(firstToken);
      const declarations = this._getDeclarationBlock();
      return { declarations, selectors };
    }

    const atRuleFeature = AT_RULES[atRuleName];
    if (atRuleFeature === HAS_NO_BLOCK) {
      const { tokens: atRuleQueries } = this._readUntil([";"]);
      return { atRuleName, atRuleQueries };
    }

    // HAS_BLOCK or HAS_SUB_RULES case
    const { tokens: atRuleQueries } = this._readUntil(["{"]);
    if (atRuleFeature === HAS_SUB_RULES) {
      const subRules = [];
      while (true) {
        // Get nested sub rule.
        const subRule = this.nextRule(true);
        if (!subRule) {
          break;
        }
        subRules.push(subRule);
      }
      return { atRuleName, atRuleQueries, subRules };
    }

    // HAS_BLOCK case
    // If we did not get the feature, try to get the block as default
    const declarations = this._getDeclarationBlock();
    return { atRuleName, atRuleQueries, declarations };
  }

  _getDeclarationBlock() {
    const declarations = {};

    while (true) {
      // end of declaration block
      const { tokens: propertyTokens } = this._readUntil([":", "}"]);
      const property = this._toString(propertyTokens);
      if (!property) {
        break;
      }

      // might be no ;
      const { tokens: values, stopText } = this._readUntil([";", "}"]);
      declarations[property] = values;

      if (stopText === "}") {
        break;
      }
    }

    return declarations;
  }

  _nextToken(isWhitespaceNeeded) {
    while (true) {
      const token = this.lexer.nextToken();

      if (!token) {
        return null;
      }

      // Skip comment and whitespace
      if (token.tokenType !== eCSSToken_Comment &&
          (isWhitespaceNeeded || token.tokenType !== eCSSToken_Whitespace)) {
        return token;
      }
    }
  }

  _readUntil(stopTexts, isWhitespaceNeeded) {
    const tokens = [];

    while (true) {
      const token = this._nextToken(isWhitespaceNeeded);

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
    return this.lexer.mBuffer.substring(first.startOffset, last.endOffset).trim();
  }
}
