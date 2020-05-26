ember-named-blocks-polyfill
==============================================================================

This addon provides a polyfill for the [Yieldable Named Blocks][RFC] feature.
On Ember.js versions with native support for the feature, this addon is inert.


Compatibility
------------------------------------------------------------------------------

* Ember.js v3.12.4 or above
* Ember CLI v2.13 or above
* Node.js v10 or above


Installation
------------------------------------------------------------------------------

```
ember install ember-named-blocks-polyfill
```


Usage
------------------------------------------------------------------------------

To pass named blocks to a component:

```hbs
<FancyList @items={{@model}}>
  <:header>This list is <em>fancy</em>!</:header>
  <:row as |item|>
    {{#if item.isHotTip}}
      <h2>Hot Tip&trade;</h2>
      <p>{{item}}</p>
    {{/if}}
  </:row>
</FancyList>
```

To yield to named blocks:

```hbs
<header class="fancy-list-header">
  {{yield to="header"}}
</header>

<ul>
  {{#each @items as |item|}}
    <li>{{yield item to="row"}}</li>
  {{/each}}
</ul>

{{#if (has-block "footer")}}
  {{yield to="footer"}}
{{else}}
  <footer>Powered by &lt;FancyList&gt;</footer>
{{/if}}
```

See the [RFC][RFC] for more information on the named blocks feature.


Deviations
------------------------------------------------------------------------------

This addon aims to be a high fidelity polyfill both in syntax and semantics.
However, there are serveral cases where we diverged from the implementation
available on Ember canary due to implementation limitations, bugs in the canary
implementation or things being underspecified in the [proposal][RFC]. These
issues are expected to be fixed or unified with upstream behavior in a future
release.

* It is not currently possible to pass an `<:else>` or `<:inverse>` named
  block. See [#1][issue-1].

* The following are considered aliases for each other:

  * `{{yield to="else"}}` and `{{yield to="inverse"}}`
  * `{{has-block "else"}}` and `{{has-block "inverse"}}`
  * `{{has-block-params "else"}}` and `{{has-block-params "inverse"}}`

  See [#2][issue-2].

* This polyfill implements stricter syntatic checks. The following are
  considered syntax errors:

  * Block names must start with lowercase letters:

    ```hbs
    <FancyList>
      <:Foo>...</:Foo>
      ~~~~~~
      Syntax Error: <:Foo> is not a valid named block: `Foo` is not a valid
      block name
    </FancyList>
    ```

  * Named blocks cannot be self-closing:

    ```hbs
    <FancyList>
      <:foo />
      ~~~~~~~~
      Syntax Error: <:Foo> is not a valid named block: named blocks cannot be
      self-closing
    </FancyList>
    ```

  * Passing named blocks to HTML elements:

    ```hbs
    <div>
      <:foo>...</:foo>
      ~~~~~~
       Syntax Error: Unexpected named block <:foo> inside <div> HTML element
    </div>
    ```

  * Mixing named blocks and other non-whitespace, non-comment content:

    ```hbs
    <FancyList>
      {{!-- comments are allowed --}}

      <:header>My Header</:header>

      <div>Some content</div>
      ~~~~~
      Syntax Error: Unexpected content inside <FancyList> component invocation:
      when using named blocks, the tag cannot contain other content
    </FancyList>
    ```

  * Block params on component invocations with named blocks:

    ```hbs
    <FancyList as |item|>
    ~~~~~~~~~~~~~~~~~~~~~
    Syntax Error: Unexpected block params list on <FancyList> component
    invocation: when passing named blocks, the invocation tag cannot take block
    params
      <:row>The {{item}}</:row>
    </FancyList>
    ```

  * Passing arguments, attributes or modifiers to named blocks:

    ```hbs
    <FancyList>
      <:header class="row">My Header</:header>
               ~~~~~~~~~~~
               Syntax Error: named block <:header> cannot have attributes or
               arguments
    </FancyList>
    ```

  * Passing the same named blocks more than once:

    ```hbs
    <FancyList>
      <:header>My Header</:header>
      <:header>It's me again!</:header>
      ~~~~~~~~~
      Syntax Error: Cannot pass named block <:header> twice in the same
      invocation
    </FancyList>
    ```

    ```hbs
    <FancyList>
      <:else>The else block</:else>
      <:inverse>The inverse block</:inverse>
      ~~~~~~~~~~
      Syntax Error: Cannot pass named blocks <:else> and <:inverse> in the same
      invocation
    </FancyList>
    ```

  * Passing invalid arguments to `{{yield}}`, `{{has-block}}` and
    `{{has-block-params}}` or passing anything other than a string literal for
    the block name argument:

    ```hbs
    {{yield block="foo"}}
                  ~~~~~
                  Syntax Error: Cannot pass block named argument to {{yield}}
    ```

    ```hbs
    {{has-block this.block}}
                ~~~~~~~~~~
                Syntax Error: {{has-block}} can only accept a string literal
                argument
    ```
  See [#3][issue-3].

* On Ember versions without native named blocks support, when passing only
  named blocks (without passing a `<:default>` block) to an external (addon)
  component whose template was not preprocessed by this polyfill,
  `{{has-block}}` in that component's template will return `true`.

  This is unlikely to be an issue in practice – if you are running an Ember
  version that requires this polyfill and the addon itself is not also using
  the polyfill, it problably means that the addon component you are invoking
  does not accept named blocks anyway, so there is no use in passing them.

  See [#4][issue-4].

Due to these issues and differences, if you wish to enable this polyfill even
when building on canary while these issues are being sorted out upstrea, you
can set the `USE_NAMED_BLOCKS_POLYFILL` environment variable to `true` when
running the build. This will transpile away any named blocks related syntax in
the final build and uses the runtime code in this addon to emulate the feature.


Contributing
------------------------------------------------------------------------------

See the [Contributing](CONTRIBUTING.md) guide for details.


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).

[RFC]: https://github.com/emberjs/rfcs/blob/master/text/0460-yieldable-named-blocks.md
[issue-1]: https://github.com/ember-polyfills/ember-named-blocks-polyfill/issues/1
[issue-2]: https://github.com/ember-polyfills/ember-named-blocks-polyfill/issues/2
[issue-3]: https://github.com/ember-polyfills/ember-named-blocks-polyfill/issues/3
[issue-4]: https://github.com/ember-polyfills/ember-named-blocks-polyfill/issues/4
