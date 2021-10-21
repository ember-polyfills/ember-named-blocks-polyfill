import { helper } from '@ember/component/helper';
import { assert } from '@ember/debug';
import { isNamedBlockInvocation } from '..';

export default helper(
  /**
   * @param {unknown[]} params
   * @param {object} hash
   * @returns {boolean}
   */
  function _isNamedBlockInvocation(params, hash) {
    assert(
      '-is-named-block-invocation takes exactly two arguments: ' +
        'the invocation value to check and the name of the block',
      params.length === 2 && typeof params[1] === 'string'
    );

    assert(
      '-is-named-block-invocation does not take named arguments',
      Object.keys(hash).length === 0
    );

    return isNamedBlockInvocation(params[0], params[1]);
  }
);
