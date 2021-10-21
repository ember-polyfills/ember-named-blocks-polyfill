import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Named Blocks', function (hooks) {
  setupRenderingTest(hooks);

  test('it can pass and yield to named blocks', async function (assert) {
    this.owner.register(
      'template:components/yielder',
      hbs`
      {{#if (eq @target "default")}}
        Rendering default block:
        {{~yield "default-block" "default-1" "default-2"~}}
      {{else if (eq @target "explicit")}}
        Rendering explicit default block:
        {{~yield "explicit-default-block" "explicit-1" "explicit-2" to="default"~}}
      {{else if (eq @target "main")}}
        Rendering main block:
        {{~yield to="main"~}}
      {{else if (eq @target "alternative")}}
        Rendering alternative block:
        {{~yield "alternative-block" "alternative-1" "alternative-2" "alternative-3" "alternative-4" to="alternative"~}}
      {{else if (eq @target "supplement")}}
        Rendering supplement block:
        {{~yield "supplement-block" to="supplement"~}}
      {{else if (eq @target "nope")}}
        Rendering nope block:
        {{~yield "nope-block" "nope-1" to="nope"~}}
      {{/if}}
    `
    );

    this.set('target', 'default');

    await render(hbs`
      <Yielder @target={{this.target}}>

        {{!-- only whitespace and comments allowed here --}}

        <:default as |name d1 d2 d3|>
          [:default]
          I am {{name}}.
          [{{d1}}] [{{d2}}] [{{d3}}]
          [{{a1}}] [{{a2}}] [{{a3}}]
          [{{s1}}] [{{s2}}] [{{s3}}]
        </:default>

        <:main>
          [:main]
          I am the main block, without block params.
          [{{d1}}] [{{d2}}] [{{d3}}]
          [{{a1}}] [{{a2}}] [{{a3}}]
          [{{s1}}] [{{s2}}] [{{s3}}]
        </:main>

        <:alternative as |name a1 a2 a3|>
          [:alternative]
          I am {{name}}.
          [{{d1}}] [{{d2}}] [{{d3}}]
          [{{a1}}] [{{a2}}] [{{a3}}]
          [{{s1}}] [{{s2}}] [{{s3}}]
        </:alternative>

        <:supplement as |name s1 s2 s3|>
          [:supplement]
          I am {{name}}.
          [{{d1}}] [{{d2}}] [{{d3}}]
          [{{a1}}] [{{a2}}] [{{a3}}]
          [{{s1}}] [{{s2}}] [{{s3}}]
        </:supplement>

        <:excess>
          The component does not take an excess block.
        </:excess>

      </Yielder>
    `);

    assert.equal(
      this.element.textContent.trim(),
      `
          Rendering default block:
          [:default]
          I am default-block.
          [default-1] [default-2] []
          [] [] []
          [] [] []
      `.trim(),
      'Rendering default block'
    );

    this.set('target', 'explicit');

    assert.equal(
      this.element.textContent.trim(),
      `
          Rendering explicit default block:
          [:default]
          I am explicit-default-block.
          [explicit-1] [explicit-2] []
          [] [] []
          [] [] []
      `.trim(),
      'Rendering explicit default block'
    );

    this.set('target', 'main');

    assert.equal(
      this.element.textContent.trim(),
      `
          Rendering main block:
          [:main]
          I am the main block, without block params.
          [] [] []
          [] [] []
          [] [] []
      `.trim(),
      'Rendering main block'
    );

    this.set('target', 'alternative');

    assert.equal(
      this.element.textContent.trim(),
      `
          Rendering alternative block:
          [:alternative]
          I am alternative-block.
          [] [] []
          [alternative-1] [alternative-2] [alternative-3]
          [] [] []
      `.trim(),
      'Rendering alternative block'
    );

    this.set('target', 'nope');

    assert.equal(
      this.element.textContent.trim(),
      `
          Rendering nope block:
      `.trim(),
      'Rendering nope block'
    );

    this.set('target', 'supplement');

    assert.equal(
      this.element.textContent.trim(),
      `
          Rendering supplement block:
          [:supplement]
          I am supplement-block.
          [] [] []
          [] [] []
          [] [] []
      `.trim(),
      'Rendering supplement block'
    );

    this.set('target', 'wat');

    assert.equal(this.element.textContent.trim(), '', 'Rendering wat block');

    this.set('target', 'default');

    assert.equal(
      this.element.textContent.trim(),
      `
          Rendering default block:
          [:default]
          I am default-block.
          [default-1] [default-2] []
          [] [] []
          [] [] []
      `.trim(),
      'Rendering default block'
    );
  });

  test('it works with has-block and has-block-params', async function (assert) {
    this.owner.register(
      'template:components/has',
      hbs`
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | {{hasBlock}} | {{has-block}} | {{hasBlockParams}} | {{has-block-params}} |
| [:default] | {{hasBlock "default"}} | {{has-block "default"}} | {{hasBlockParams "default"}} | {{has-block-params "default"}} |
|    [:main] | {{hasBlock "main"}} | {{has-block "main"}} | {{hasBlockParams "main"}} | {{has-block-params "main"}} |
| [:inverse] | {{hasBlock "inverse"}} | {{has-block "inverse"}} | {{hasBlockParams "inverse"}} | {{has-block-params "inverse"}} |
|    [:else] | {{hasBlock "else"}} | {{has-block "else"}} | {{hasBlockParams "else"}} | {{has-block-params "else"}} |
|   [:other] | {{hasBlock "other"}} | {{has-block "other"}} | {{hasBlockParams "other"}} | {{has-block-params "other"}} |
    `
    );

    await render(hbs`<Has />`);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | false | false | false | false |
| [:default] | false | false | false | false |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | false | false | false | false |
      `.trim(),
      'No blocks'
    );

    await render(hbs`<Has>implicit default block without block params</Has>`);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | true | true | false | false |
| [:default] | true | true | false | false |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | false | false | false | false |
      `.trim(),
      'implicit default block without block params'
    );

    await render(
      hbs`<Has as |param|>implicit default block with block params</Has>`
    );

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | true | true | true | true |
| [:default] | true | true | true | true |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | false | false | false | false |
      `.trim(),
      'implicit default block with block params'
    );

    await render(hbs`
      <Has>
        <:default>named default block without block params</:default>
      </Has>
    `);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | true | true | false | false |
| [:default] | true | true | false | false |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | false | false | false | false |
      `.trim(),
      'named default block without block params'
    );

    await render(hbs`
      <Has>
        <:default as |foo|>named default block with block params</:default>
      </Has>
    `);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | true | true | true | true |
| [:default] | true | true | true | true |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | false | false | false | false |
      `.trim(),
      'named default block with block params'
    );

    await render(hbs`
      <Has>
        <:main>named main block without block params</:main>
      </Has>
    `);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | false | false | false | false |
| [:default] | false | false | false | false |
|    [:main] | true | true | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | false | false | false | false |
      `.trim(),
      'named main block without block params'
    );

    await render(hbs`
      <Has>
        <:main as |foo|>named main block with block params</:main>
      </Has>
    `);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | false | false | false | false |
| [:default] | false | false | false | false |
|    [:main] | true | true | true | true |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | false | false | false | false |
      `.trim(),
      'named main block with block params'
    );

    await render(hbs`
      <Has>
        <:other>named non-default block without block params</:other>
      </Has>
    `);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | false | false | false | false |
| [:default] | false | false | false | false |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | true | true | false | false |
      `.trim(),
      'named non-default block with block params'
    );

    await render(hbs`
      <Has>
        <:other as |param|>named non-default block with block params</:other>
      </Has>
    `);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | false | false | false | false |
| [:default] | false | false | false | false |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | true | true | true | true |
      `.trim(),
      'named non-default block with block params'
    );

    await render(hbs`
      <Has>
        <:default>named default block without block params and</:default>
        <:other>named non-default block without block params</:other>
      </Has>
    `);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | true | true | false | false |
| [:default] | true | true | false | false |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | true | true | false | false |
      `.trim(),
      'named default and non-default blocks without block params'
    );

    await render(hbs`
      <Has>
        <:default as |param|>named default block with block params and</:default>
        <:other>named non-default block without block params</:other>
      </Has>
    `);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | true | true | true | true |
| [:default] | true | true | true | true |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | true | true | false | false |
      `.trim(),
      'named default block with block params and non-default block without block params'
    );

    await render(hbs`
      <Has>
        <:default>named default block without block params and</:default>
        <:other as |param|>named non-default block with block params</:other>
      </Has>
    `);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | true | true | false | false |
| [:default] | true | true | false | false |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | true | true | true | true |
      `.trim(),
      'named default block without block params and non-default block with block params'
    );

    await render(hbs`
      <Has>
        <:default as |defaultParam|>named default block with block params and</:default>
        <:other as |otherParam|>named non-default block with block params</:other>
      </Has>
    `);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | true | true | true | true |
| [:default] | true | true | true | true |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | true | true | true | true |
      `.trim(),
      'named default and non-default blocks with block params'
    );

    await render(hbs`{{has}}`);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | false | false | false | false |
| [:default] | false | false | false | false |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | false | false | false | false |
      `.trim(),
      'curly with no blocks'
    );

    await render(hbs`{{#has}}curly default block without block params{{/has}}`);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | true | true | false | false |
| [:default] | true | true | false | false |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | false | false | false | false |
      `.trim(),
      'curly default block without block params'
    );

    await render(
      hbs`{{#has as |param|}}curly default block with block params{{/has}}`
    );

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | true | true | true | true |
| [:default] | true | true | true | true |
|    [:main] | false | false | false | false |
| [:inverse] | false | false | false | false |
|    [:else] | false | false | false | false |
|   [:other] | false | false | false | false |
      `.trim(),
      'curly default block with block params'
    );

    await render(hbs`
      {{#has}}
        curly default block without block params and
      {{else}}
        curly inverse block
      {{/has}}
    `);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | true | true | false | false |
| [:default] | true | true | false | false |
|    [:main] | false | false | false | false |
| [:inverse] | true | true | false | false |
|    [:else] | true | true | false | false |
|   [:other] | false | false | false | false |
      `.trim(),
      'curly default and inverse blocks without block params'
    );

    await render(hbs`
      {{#has as |param|}}
        curly default block with block params and
      {{else}}
        curly inverse block
      {{/has}}
    `);

    assert.equal(
      this.element.textContent.trim(),
      `
|            | (hasBlock) | (has-block) | (hasBlockParams) | (has-block-params) |
|            | true | true | true | true |
| [:default] | true | true | true | true |
|    [:main] | false | false | false | false |
| [:inverse] | true | true | false | false |
|    [:else] | true | true | false | false |
|   [:other] | false | false | false | false |
      `.trim(),
      'curly default and inverse blocks with block params'
    );
  });
});
