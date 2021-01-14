ember-named-blocks-polyfill
==============================================================================

This addon provides a polyfill for the [Yieldable Named Blocks][RFC] feature.
On Ember.js versions with native support for the feature (3.25+), this addon is
inert.


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


Limitations
------------------------------------------------------------------------------

This addon aims to be a high fidelity polyfill both in syntax and semantics.
However, there are some minor limitations:

* It is not currently possible to pass an `<:else>` or `<:inverse>` named
  block. See [#1][issue-1].

* When passing only named blocks (without passing a `<:default>` block) to an
  addon component whose template was not preprocessed by this polyfill,
  `{{has-block}}` in that component's template will return `true`.

  This is unlikely to be an issue in practice – if you are running an Ember
  version that requires this polyfill and the addon itself is not also using
  the polyfill, it problably means that the addon component you are invoking
  does not accept named blocks anyway, so there is no use in passing them.

  See [#4][issue-4].


Contributing
------------------------------------------------------------------------------

See the [Contributing](CONTRIBUTING.md) guide for details.


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).

[RFC]: https://github.com/emberjs/rfcs/blob/master/text/0460-yieldable-named-blocks.md
[issue-1]: https://github.com/ember-polyfills/ember-named-blocks-polyfill/issues/1
[issue-4]: https://github.com/ember-polyfills/ember-named-blocks-polyfill/issues/4
