// @ts-check

/**
 * @typedef { import('@glimmer/syntax').ASTPluginBuilder } ASTPluginBuilder
 * @typedef { import('@glimmer/syntax').ASTPluginEnvironment } ASTPluginEnvironment
 * @typedef { import('@glimmer/syntax').Builders } Builders
 * @typedef { import('@glimmer/syntax').NodeVisitor } NodeVisitor
 *
 * @typedef { import('@glimmer/syntax').AST.AttrNode } AttrNode
 * @typedef { import('@glimmer/syntax').AST.BaseNode } BaseNode
 * @typedef { import('@glimmer/syntax').AST.Block } Block
 * @typedef { import('@glimmer/syntax').AST.BlockStatement } BlockStatement
 * @typedef { import('@glimmer/syntax').AST.ElementModifierStatement } ElementModifierStatement
 * @typedef { import('@glimmer/syntax').AST.ElementNode } ElementNode
 * @typedef { import('@glimmer/syntax').AST.Expression } Expression
 * @typedef { import('@glimmer/syntax').AST.Literal } Literal
 * @typedef { import('@glimmer/syntax').AST.MustacheCommentStatement } MustacheCommentStatement
 * @typedef { import('@glimmer/syntax').AST.MustacheStatement } MustacheStatement
 * @typedef { import('@glimmer/syntax').AST.Node } Node
 * @typedef { import('@glimmer/syntax').AST.PathExpression } PathExpression
 * @typedef { import('@glimmer/syntax').AST.Program } Program
 * @typedef { import('@glimmer/syntax').AST.SourceLocation } SourceLocation
 * @typedef { import('@glimmer/syntax').AST.Statement } Statement
 * @typedef { import('@glimmer/syntax').AST.StringLiteral } StringLiteral
 * @typedef { import('@glimmer/syntax').AST.SubExpression } SubExpression
 * @typedef { import('@glimmer/syntax').AST.Template } Template
 * @typedef { import('@glimmer/syntax').AST.TextNode } TextNode
 */

const ELSE_BLOCK_ISSUE_URL = 'http://github.com/ember-polyfills/ember-named-blocks-polyfill/issues/1';

/**
 * @type {ASTPluginBuilder}
 */
module.exports = function NamedBlocksPolyfillPluginBuilder(env) {
  let { visitor } = new NamedBlocksPolyfill(env)

  return {
    name: 'named-blocks-polyfill',
    visitor
  };
}

class NamedBlocksPolyfill {
  /**
   * @param {ASTPluginEnvironment} env
   */
  constructor(env) {
    /**
     * @private
     * @type {ASTPluginEnvironment}
     */
    this.env = env;

    /**
     * @private
     * @type {LexicalScope}
     */
    this.scope = new LexicalScope();

    /**
     * @private
     * @type {WeakSet<Node>}
     */
    this.skipList = new WeakSet();
  }

  /**
   * @private
   * @param {Template} node
   * @returns {void}
   */
  EnterTemplate(node) {
    assert(this.scope.isRoot, 'Invalid nesting: not in root scope');

    // BUG?
    check(
      node.blockParams.length === 0,
      `Template cannot have block params, found ${node.blockParams.join(',')}`,
      node
    );
  }

  /**
   * @private
   * @param {Template} node
   * @returns {void}
   */
  ExitTemplate(node) {
    assert(this.scope.isRoot, 'Invalid nesting: not in root scope');

    // BUG?
    check(
      node.blockParams.length === 0,
      `Template cannot have block params, found ${node.blockParams.join(',')}`,
      node
    );
  }

  /**
   * @private
   * @param {Block} node
   * @returns {void}
   */
  EnterBlock(node) {
    this.scope.push(node);
  }

  /**
   * @private
   * @param {Block} node
   * @returns {void}
   */
  ExitBlock(node) {
    let actual = this.scope.pop();

    assert(
      JSON.stringify(node) === JSON.stringify(actual),
      () => `Invalid nesting: expecting block ${
        JSON.stringify(node)
      } got ${
        JSON.stringify(actual)
      }`
    );
  }

  /**
   * @private
   * @param {ElementNode} node
   * @returns {ElementNode | void}
   */
  EnterElementNode(node) {
    // Are these really syntax errors, or are they just bugs?
    if (node.selfClosing) {
      check(
        node.blockParams.length === 0,
        `Self closing tag <${node.tag} /> cannot have block params`,
        node
      );

      check(
        node.children.length === 0,
        `Self closing tag <${node.tag} /> cannot have children`,
        node
      );

      return;
    }

    check(
      !isNamedBlock(node),
      `Unexpected named block <${node.tag}>`,
      node
    );

    let isComponent = this.isComponent(node);
    let namedBlocks = this.namedBlocksFor(node);

    if (isComponent && namedBlocks.length > 0) {
      check(
        node.blockParams.length === 0,
        `Unexpected block params list on <${node.tag}> component invocation: ` +
        `when passing named blocks, the invocation tag cannot take block params`,
        node.loc
      );

      return this.transformNamedBlocks(node, namedBlocks);
    } else if (isComponent) {
      this.scope.push(node);
    } else {
      check(
        node.blockParams.length === 0,
        `Unexpected block params on <${node.tag}> HTML element`,
        node
      );

      check(
        namedBlocks.length === 0,
        () => `Unexpected named block <${namedBlocks[0].tag}> inside <${node.tag}> HTML element`,
        namedBlocks[0]
      );
    }
  }

  /**
   * @private
   * @param {ElementNode} node
   * @returns {void}
   */
  ExitElementNode(node) {
    if (!node.selfClosing && this.isComponent(node, true)) {
      let actual = this.scope.pop();

      assert(
        JSON.stringify(node) === JSON.stringify(actual),
        `Invalid nesting: expecting component invocation ${
          JSON.stringify(node)
        } got ${
          JSON.stringify(actual)
        }`
      );
    }
  }

  /**
   * @private
   * @param {Template| Block | Program} node
   * @returns {void}
   */
  EnterProgram(node) {
    if (node.type === 'Template') {
      this.EnterTemplate(node);
    } else if (node.type === 'Block') {
      this.EnterBlock(node);
    } else if (this.scope.isRoot) {
      this.EnterTemplate({ ...node, type: 'Template' });
      this.scope.push(node);
    } else {
      this.EnterBlock({ ...node, type: 'Block' });
    }
  }

  /**
   * @private
   * @param {Template | Block | Program} node
   * @returns {void}
   */
  ExitProgram(node) {
    if (node.type === 'Template') {
      this.ExitTemplate(node);
    } else if (node.type === 'Block') {
      this.ExitBlock(node);
    } else if (this.scope.depth === 1) {
      let actual = this.scope.pop();

      assert(
        node === actual,
        `Invalid nesting: expecting template ${
          JSON.stringify(node)
        } got ${
          JSON.stringify(actual)
        }`
      );

      this.ExitTemplate({ ...node, type: 'Template' });
    } else {
      this.ExitBlock({ ...node, type: 'Block' });
    }
  }

  /**
   * @private
   * @param {MustacheStatement} node
   * @returns {MustacheStatement | void}
   */
  MustacheStatement(node) {
    switch (node.path.original) {
      case 'yield':
        return this.transformYield(node);
      case 'hasBlock':
      case 'has-block':
        return this.transformHasBlock(node);
      case 'hasBlockParams':
      case 'has-block-params':
        return this.transformHasBlock(node, true);
    }
  }

  /**
   * @private
   * @param {SubExpression} node
   * @returns {SubExpression | void}
   */
  SubExpression(node) {
    switch (node.path.original) {
      case 'hasBlock':
      case 'has-block':
        return this.transformHasBlock(node);
      case 'hasBlockParams':
      case 'has-block-params':
        return this.transformHasBlock(node, true);
    }
  }

  /**
   * @typedef {{ data: false, this: false, parts: [string] }} Simple
   * @typedef {PathExpression & Simple} SimplePathExpression
   *
   * Checks if a `PathExpression` is a simple path.
   *
   * @param {PathExpression} node
   * @returns {path is SimplePathExpression}
   */
  isSimplePath(node) {
    let { parts } = node;

    if (node.data || node.this || this.scope.isLocal(parts[0]) || parts.length > 1) {
      return false;
    } else {
      check(
        node.original === parts[0],
        `Invalid path: expecting \`${node.original}\`, got \`${parts[0]}\``,
        node
      );

      return true;
    }
  }

  /**
   * Check if an `ElementNode` is a component invocation.
   *
   * @private
   * @param {ElementNode} node
   * @param {boolean} [ignoreTop=false]
   * @returns {boolean}
   */
  isComponent(node, ignoreTop = false) {
    let [head, ...rest] = node.tag.split('.');

    return (
      rest.length > 0 ||
      head.startsWith('@') ||
      /^[A-Z]/.test(head) ||
      this.scope.isLocal(head, ignoreTop)
    );
  }

  /**
   * Return the named blocks for an `ElementNode`, if any.
   *
   * @private
   * @param {ElementNode} node
   * @returns {ElementNode[]}
   */
  namedBlocksFor(node) {
    /**
     * @type {string[]}
     */
    let names = [];

    /**
     * @type {ElementNode[]}
     */
    let namedBlocks = [];

    /**
     * @type {Statement[]}
     */
    let nonNamedBlocks = [];

    for (let statement of node.children) {
      if (isComment(statement) || isTextNode(statement) && isWhitespace(statement)) {
        continue;
      } else if (isElementNode(statement) && isNamedBlock(statement)) {
        check(
          nonNamedBlocks.length === 0,
          `Unexpected content inside <${node.tag}> component invocation: ` +
          `when using named blocks, the tag cannot contain other content\n${JSON.stringify(nonNamedBlocks[0], null, 2)}`,
          nonNamedBlocks[0]
        );

        let name = statement.tag.slice(1);

        check(
          names.indexOf(name) === -1,
          `Cannot pass named block <${name}> twice in the same invocation`,
          statement
        );

        if (name === 'else') {
          check(
            names.indexOf('inverse') === -1,
            `Cannot pass named blocks <:else> and <:inverse> in the same invocation`,
            statement
          );

          // TODO
          check(
            false,
            `Cannot pass named block <:else>, this is not currently supported by ` +
            `ember-named-blocks-polyfill, see: ${ELSE_BLOCK_ISSUE_URL}`,
            statement
          );

          // name = 'inverse';
          // statement.tag = ':inverse';
        } else if (name === 'inverse') {
          // TODO
          check(
            false,
            `Cannot pass named block <:inverse>, this is not currently supported by ` +
            `ember-named-blocks-polyfill, see: ${ELSE_BLOCK_ISSUE_URL}`,
            statement
          );
        }

        names.push(name);
        namedBlocks.push(statement);
      } else {
        check(
          namedBlocks.length === 0,
          `Unexpected content inside <${node.tag}> component invocation: ` +
          `when using named blocks, the tag cannot contain other content`,
          statement
        );

        nonNamedBlocks.push(statement);
      }
    }

    return namedBlocks;
  }

  /**
   * Transform:
   *
   * ```hbs
   * <MyComponent @some="args">
   *   <:default as |foo|>
   *     {{!-- default block --}}
   *   </:default>
   *   <:another as |bar baz|>
   *     {{!-- another block --}}
   *   </:another>
   *   <:yetAnother>
   *     {{!-- yet another block --}}
   *   </:yetAnother>
   * </MyComponent>
   * ```
   *
   * Into:
   *
   * ```hbs
   * <MyComponent @some="args" @namedBlocksInfo={{hash default=1 another=2 yetAnother=0}} as |__arg0 __arg1 __arg2|>
   *   {{#if (-is-named-block-invocation __arg0 "default")}}
   *     {{#let __arg0 as |foo|}}
   *       {{!-- default block --}}
   *     {{/let}}
   *   {{else if (-is-named-block-invocation __arg0 "another")}}
   *     {{#let __arg1 __arg2 as |bar baz|}}
   *       {{!-- another block --}}
   *     {{/let}}
   *   {{else if (-is-named-block-invocation __arg0 "yetAnother")}}
   *     {{!-- yet another block --}}
   *   {{/if}}
   * </MyComponent>
   * ```
   *
   * @private
   * @param {ElementNode} node
   * @param {ElementNode[]} namedBlocks
   * @returns {ElementNode}
   */
  transformNamedBlocks(node, namedBlocks) {
    let b = this.builders;

    if (namedBlocks.length === 1 && namedBlocks[0].tag === ':default') {
      return b.element(
        node.tag,
        node.attributes,
        node.modifiers,
        namedBlocks[0].children,
        null,
        namedBlocks[0].blockParams,
        node.loc
      );
    }

    let metadata = b.attr('@namedBlocksInfo', b.mustache(b.path('hash'), [],
      b.hash(namedBlocks.map(block => b.pair(
        block.tag.slice(1), b.number(block.blockParams.length)
      )))
    ));

    let blocks = this.chainBlocks(
      namedBlocks.map(block => this.transformNamedBlock(block))
    );

    let numBlockParams = Math.max(
      ...namedBlocks.map(block => {
        if (block.tag === ':default') {
          return block.blockParams.length;
        } else {
          return block.blockParams.length + 1;
        }
      })
    );

    let blockParams = [];

    for (let i=0; i<numBlockParams; i++) {
      blockParams.push(`__arg${i}`);
    }

    return b.element(
      node.tag,
      [...node.attributes, metadata],
      node.modifiers,
      [blocks],
      null,
      blockParams,
      node.loc
    );
  }

  /**
   * Transform:
   *
   * ```hbs
   * <:default as |foo|>
   *   {{!-- default block --}}
   * </:default>
   * ```
   *
   * Into:
   *
   * ```hbs
   * {{#if (-is-named-block-invocation __arg0 "default")}}
   *   {{#let __arg0 as |foo|}}
   *     {{!-- default block --}}
   *   {{/let}}
   * {{/if}}
   * ```
   *
   * And:
   *
   * ```hbs
   * <:another as |bar baz|>
   *   {{!-- another block --}}
   * </:another>
   * ```
   *
   * Into:
   *
   * ```hbs
   * {{#if (-is-named-block-invocation __arg0 "another")}}
   *   {{#let __arg1 __arg2 as |bar baz|}}
   *     {{!-- another block --}}
   *   {{/let}}
   * {{/if}}
   * ```
   *
   * @private
   * @param {ElementNode} namedBlock
   * @returns {BlockStatement}
   */
  transformNamedBlock({ tag, children, blockParams, loc }) {
    let b = this.builders;
    let name = tag.slice(1);

    let block = b.blockItself(children, blockParams, false, loc);

    if (blockParams.length > 0) {
      // Wrap in {{#let}}
      let params = blockParams.map((_, i) => {
        if (name === 'default') {
          return b.path(`__arg${i}`);
        } else {
          return b.path(`__arg${i+1}`);
        }
      });

      block = b.blockItself(
        [b.block(b.path('let'), params, null, block, null, loc)],
        [],
        false,
        loc
      );
    }

    let params = [b.sexpr(
      b.path('-is-named-block-invocation'),
      [b.path('__arg0'), b.string(name)]
    )];

    return b.block(b.path('if'), params, null, block, null, loc);
  }

  /**
   * Transforms:
   *
   * ```hbs
   * {{yield this.foo to="bar"}}
   * ```
   *
   * Into:
   *
   * ```hbs
   * {{yield (-named-block-invocation "bar") this.foo}}
   * ```
   *
   * @private
   * @param {MustacheStatement} node
   * @returns {MustacheStatement | void}
   */
  transformYield(node) {
    let b = this.builders;
    let { path, params, hash, escaped, loc } = node;

    check(
      isPath(path) && this.isSimplePath(path),
      `Invalid {{yield}} invocation: expecting a simple path`,
      loc
    );

    if (hash.pairs.length === 0) {
      return;
    }

    check(
      hash.pairs.length === 1 && hash.pairs[0].key === 'to',
      () => `Cannot pass ${hash.pairs[0].key} named argument to {{yield}}`,
      loc
    );

    let to = hash.pairs[0].value;

    check(
      isStringLiteral(to),
      '{{yield}} can only accept a string literal for the `to` argument',
      to
    );

    if (to.value === 'default') {
      hash = null;
    } else if (to.value === 'else' || to.value === 'inverse') {
      // TODO: valid?
      check(params.length === 0, 'Cannot yield params to inverse block', loc);
      hash = b.hash([b.pair('to', b.string('inverse'))], hash.loc);
    } else {
      let invocation = b.sexpr(
        b.path('-named-block-invocation'),
        [to],
        null,
        to.loc
      );

      params = [invocation, ...params];
      hash = null;
    }

    return b.mustache(path, params, hash, !escaped, loc);
  }

  /**
   * Transforms:
   *
   * ```hbs
   * {{has-block "foo"}}
   * ```
   *
   * Into:
   *
   * ```hbs
   * {{-has-block @namedBlocksInfo "foo"}}
   * ```
   *
   * And:
   *
   * ```hbs
   * {{has-block-params "foo"}}
   * ```
   *
   * Into:
   *
   * ```hbs
   * {{-has-block-params @namedBlocksInfo "foo"}}
   * ```
   *
   * @private
   * @template {MustacheStatement | SubExpression} T
   * @param {T} node
   * @param {boolean} [hasBlockParams]
   * @returns {T | void}
   */
  transformHasBlock(node, hasBlockParams = false) {
    let b = this.builders;
    let { path, params, hash, loc } = node;

    let display = isMustache(node) ? `{{${node.path.original}}}` : `(${node.path.original})`;

    check(
      isPath(path) && this.isSimplePath(path),
      `Invalid ${display} invocation: expecting a simple path`,
      loc
    );

    check(
      hash.pairs.length === 0,
      () => `Cannot pass ${hash.pairs[0].key} named argument to ${display}`,
      loc
    );

    /**
     * @type {string}
     */
    let block;

    if (params.length === 0) {
      block = 'default';
    } else {
      check(
        params.length === 1,
        `${display} only takes a single argument`,
        params[1]
      );

      check(
        isStringLiteral(params[0]),
        `${display} can only accept a string literal argument`,
        params[0]
      );

      block = params[0].value;
    }

    if (block === 'else') {
      block = 'inverse';
    }

    /**
     * @type {SubExpression | Literal}
     */
    let fallback;

    if (block === 'default') {
      // Avoid visiting this node again and trigger an infinite loop
      fallback = this.skip(b.sexpr(path, null, null, loc));
    } else if (block === 'inverse') {
      // Avoid visiting this node again and trigger an infinite loop
      fallback = this.skip(b.sexpr(path, [b.string('inverse')], null, loc));
    } else {
      fallback = b.boolean(false);
    }

    path = hasBlockParams ? b.path('-has-block-params', path.loc) : b.path('-has-block', path.loc);
    params = [b.path('@namedBlocksInfo'), b.string(block), fallback];

    if (isMustache(node)) {
      // @ts-ignore
      return b.mustache(path, params, null, !node.escaped, loc);
    } else {
      // @ts-ignore
      return b.sexpr(path, params, null, loc);
    }
  }

  /**
   * Chain an array of `{{#if ...}}...{{/if}}` blocks into
   * `{{#if ...}}...{{else if ...}}...{{/if}}`.
   *
   * @param {BlockStatement[]} blocks
   * @returns {BlockStatement}
   */
  chainBlocks(blocks) {
    let b = this.builders;

    blocks.reduce((parent, block) => {
      assert(!parent.inverse, 'Parent block already has an inverse block');

      assert(
        this.isSimplePath(block.path) && block.path.original == 'if',
        `Expecting {{#if}}, got {{#${block.path.original}}}`
      );

      parent.inverse = b.blockItself([block], [], true, block.loc);

      return block;
    });

    return blocks[0];
  }

  /**
   * Add a node to the skip list so don't visit it again.
   *
   * @template {Node} T
   * @param {T} node
   * @returns {T}
   */
  skip(node) {
    this.env.syntax.traverse(node, {
      All: node => { this.skipList.add(node); }
    });

    return node;
  }

  /**
   * @template {Node} T
   * @callback NodeCallback
   * @param {T} node
   * @returns {T | void}
   */

  /**
   * Guard the callback with the skip list, also binds it to this.
   *
   * @private
   * @template {Node} T
   * @param {NodeCallback<T>} callback
   * @returns {NodeCallback<T>}
   */
  guard(callback) {
    return node => {
      if (!this.skipList.has(node)) {
        return callback.call(this, node);
      }
    };
  }

  /**
   * @type {Builders}
   */
  get builders() {
    let b = this.env.syntax.builders;

    /**
     * @type {Builders['blockItself']}
     */
    let blockItself = function buildBlockItself(body = [], blockParams = [], _chained, loc) {
      return b.program(body, blockParams, loc);
    };

    /**
     * @type {Builders['path']}
     */
    let path = function buildPath(original, loc) {
      let result = b.path(original, loc);

      if (typeof original === 'string' && original.startsWith('@') && !result.data) {
        result.data = true;
        result.parts[0] = result.parts[0].slice(1);
      }

      return result;
    };

    let element = b.element;

    if (element.length === 2) {
      /**
       * @typedef {string | { name: string, selfClosing: boolean }} TagDescriptor
       *
       * @typedef {object} NewElementBuilderOptions
       * @property {AttrNode[]} [attrs]
       * @property {ElementModifierStatement[]} [modifiers]
       * @property {Statement[]} [children]
       * @property {MustacheCommentStatement[]} [comments]
       * @property {string[]} [blockParams]
       * @property {SourceLocation} [loc]
       *
       * @callback NewElementBuilder
       * @param {TagDescriptor} tag
       * @param {NewElementBuilderOptions} options
       * @returns {ElementNode}
       *
       * @type {NewElementBuilder}
       */
      let buildElementNew;

      // @ts-ignore
      buildElementNew = b.element;

      /**
       * @callback CanonicalElementBuilder
       * @param {TagDescriptor} tag
       * @param {AttrNode[]} [attributes]
       * @param {ElementModifierStatement[]} [modifiers]
       * @param {Statement[]} [children]
       * @param {MustacheCommentStatement[]} [comments]
       * @param {string[]} [blockParams]
       * @param {SourceLocation} [loc]
       * @returns {ElementNode}
       *
       * @callback LegacyElementBuilder
       * @param {TagDescriptor} tag
       * @param {AttrNode[]} [attributes]
       * @param {ElementModifierStatement[]} [modifiers]
       * @param {Statement[]} [children]
       * @param {SourceLocation} [loc]
       * @returns {ElementNode}
       *
       * @type {CanonicalElementBuilder & LegacyElementBuilder}
       */
      element = function buildElement(tag, ...args) {
        /**
         * @type {NewElementBuilderOptions}
         */
        let options;

        if (args.length <= 3) {
          let [attrs, modifiers, children] = args;
          options = { attrs, modifiers, children };
        } else if (args.length > 4 || Array.isArray(args[3])) {
          let [attrs, modifiers, children, comments, blockParams, loc] = args;
          options = { attrs, modifiers, children, comments, blockParams, loc };
        } else {
          let [attrs, modifiers, children, loc] = args;
          options = { attrs, modifiers, children, loc };
        }

        return buildElementNew(tag, options);
      };
    }


    return { blockItself, ...b, path, element };
  }

  /**
   * @public
   * @type {NodeVisitor}
   */
  get visitor() {
    return {
      Program: {
        enter: this.guard(this.EnterProgram),
        exit: this.guard(this.ExitProgram),
      },
      ElementNode: {
        enter: this.guard(this.EnterElementNode),
        exit: this.guard(this.ExitElementNode),
      },
      MustacheStatement: this.guard(this.MustacheStatement),
      SubExpression: this.guard(this.SubExpression),
    };
  }
}

class LexicalScope {
  /**
   * @typedef {Node & { blockParams: string[] }} HasBlockParams
   */
  constructor() {
    /**
     * @private
     * @type {Array<HasBlockParams>}
     */
    this.stack = [];
  }

  /**
   * Checks if _name_ is a local variable.
   *
   * @public
   * @param {string} name An identifier.
   * @param {boolean} [ignoreTop=false] Whether to ignore the current block.
   * @returns {boolean} Whether _name_ is a local variable.
   */
  isLocal(name, ignoreTop = false) {
    let { stack } = this;

    if (ignoreTop) {
      stack = stack.slice(0, -1);
    }

    return stack.some(b => b.blockParams.indexOf(name) !== -1);
  }

  /**
   * The current depth.
   *
   * @public
   * @type {number}
   */
  get depth() {
    return this.stack.length;
  }

  /**
   * Check if we are currently at the root scope.
   *
   * @public
   * @type {boolean}
   */
  get isRoot() {
    return this.depth === 0;
  }

  /**
   * Push a new level of lexical scope.
   *
   * @public
   * @param {HasBlockParams} block
   * @returns {void}
   */
  push(block) {
    this.stack.push(block);
  }

  /**
   * Pops the top most level of lexical scope.
   *
   * @public
   * @returns {HasBlockParams}
   */
  pop() {
    assert(!this.isRoot, 'Cannot pop root scope');
    return this.stack.pop();
  }
}

/**
 * Check if _value_ is a `Node`.
 *
 * @param {unknown} value
 * @returns {value is Node}
 */
function isNode(value) {
  return value &&
    typeof value === 'object' &&
    typeof value['type'] === 'string';
}

/**
 * Check if _node_ is a `StringLiteral`.
 *
 * @param {Node} node
 * @returns {node is StringLiteral}
 */
function isStringLiteral(node) {
  return node.type === 'StringLiteral';
}

/**
 * Check if _node_ is a `PathExpression`.
 *
 * @param {Node} node
 * @returns {node is PathExpression}
 */
function isPath(node) {
  return node.type === 'PathExpression';
}

/**
 * Check if _node_ is a `MustacheStatement`.
 *
 * @param {Node} node
 * @returns {node is MustacheStatement}
 */
function isMustache(node) {
  return node.type === 'MustacheStatement';
}

/**
 * Check if _node_ is a `MustacheCommentStatement`.
 *
 * @param {Statement} node
 * @returns {node is MustacheCommentStatement}
 */
function isComment(node) {
  return node.type === 'MustacheCommentStatement';
}

/**
 * Check if _node_ is an `ElementNode`.
 *
 * @param {Statement} node
 * @returns {node is ElementNode}
 */
function isElementNode(node) {
  return node.type === 'ElementNode';
}

/**
 * Check if _node_ is a `TextNode`.
 *
 * @param {Statement} node
 * @returns {node is TextNode}
 */
function isTextNode(node) {
  return node.type === 'TextNode';
}

/**
 * Check if _node_ is an whitespace-only `TextNode`.
 *
 * @param {TextNode} node
 * @returns {boolean}
 */
function isWhitespace(node) {
  return isTextNode(node) && node.chars.trim() === '';
}


/**
 * Check if _node_ is a named block.
 *
 * @param {ElementNode} node
 * @returns {boolean}
 */
function isNamedBlock(node) {
  if (isElementNode(node) && node.tag.startsWith(':')) {
    let id = node.tag.slice(1);

    check(
      isValidBlockName(id),
      `<${node.tag}> is not a valid named block: ` +
      `\`${id}\` is not a valid block name`,
      node.loc
    );

    check(
      !node.selfClosing,
      `<${node.tag} /> is not a valid named block: ` +
      `named blocks cannot be self-closing`,
      node.loc
    );

    check(
      node.attributes.length === 0,
      `Named block <${node.tag}> cannot have attributes or arguments`,
      node.loc
    );

    check(
      node.modifiers.length === 0,
      `Named block <${node.tag}> cannot have modifiers`,
      node.loc
    );

    return true;
  } else {
    return false;
  }
}

/**
 * Check if _id_ is a valid identifier.
 *
 * @param {string} id
 * @returns {boolean}
 */
function isValidBlockName(id) {
  // TODO: what is the actual "identifier" regex?
  return id.indexOf('.') === -1 && /^[a-z]/.test(id);
}

/**
 * @callback MessageCallback
 * @returns {string}
 *
 * @typedef {MessageCallback | string} Message
 */

/**
 * @param {Message} message
 * @returns {string}
 */
function messageFor(message) {
  if (typeof message === 'function') {
    return message();
  } else {
    return message;
  }
}

/**
 * @callback MessageLocationCallback
 * @returns {SourceLocation | undefined}
 *
 * @typedef {Node | SourceLocation | MessageLocationCallback | undefined} MessageLocation
 */

/**
 * @param {MessageLocation} loc
 * @returns {string}
 */
function locFor(loc) {
  /**
   * @type {SourceLocation | undefined}
   */
  let location;

  if (typeof loc === 'function') {
    location = loc();
  } else if (isNode(loc)) {
    location = loc.loc
  } else {
    location = loc;
  }

  if (location && location.source) {
    return ` (at ${location.source} on line ${location.start.line} column ${location.start.column})`;
  } else {
    return ` (on line ${location.start.line} column ${location.start.column})`;
  }
}

/**
 * @param {any} condition
 * @param {Message} [message]
 * @returns {asserts condition}
 */
function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(
      `[BUG] ${messageFor(message)}\n` +
      'This is likely a bug in the ember-named-blocks-polyfill addon. ' +
      'Please file a bug at http://github.com/ember-polyfills/ember-named-blocks-polyfill'
    );
  }
}

/**
 * @param {any} condition
 * @param {Message} message
 * @param {MessageLocation} loc
 * @returns {asserts condition}
 */
function check(condition, message, loc) {
  if (!condition) {
    throw new Error(`Syntax Error: ${messageFor(message)}${locFor(loc)}`);
  }
}
