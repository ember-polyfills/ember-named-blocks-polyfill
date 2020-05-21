import { helper } from '@ember/component/helper';
import { assert } from '@ember/debug';
import { namedBlockInvocation } from '..';

export default helper(
  /**
   * @param {unknown[]} params
   * @param {object} hash
   * @returns {unknown}
   */
  function _namedBlockInvocation(params, hash) {
    assert(
      '-named-block-invocation takes a single string argument',
      params.length === 1 && typeof params[0] === 'string'
    );

    assert(
      '-named-block-invocation does not take named arguments',
      Object.keys(hash).length === 0
    );

    return namedBlockInvocation(params[0]);
  }
);
