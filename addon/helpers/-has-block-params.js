import { helper } from '@ember/component/helper';
import { assert } from '@ember/debug';
import { isBlocksInfo } from '..';

export default helper(
  /**
   * @param {unknown[]} params
   * @param {object} hash
   * @returns {boolean}
   */
  function _hasBlockParams(params, hash) {
    let [blocksInfo, block, fallback] = params;

    assert(
      '-has-block-params takes exactly three arguments: the blocks ' +
      'info hash, the name of the block and the fallback value',
      params.length === 3 &&
        (blocksInfo === undefined || isBlocksInfo(blocksInfo)) &&
        typeof block === 'string' && typeof fallback === 'boolean'
    );

    assert(
      '-is-named-block-invocation does not take named arguments',
      Object.keys(hash).length === 0
    );

    return blocksInfo ? block in blocksInfo && blocksInfo[block] > 0 : fallback;
  }
);
