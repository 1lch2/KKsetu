import { describe, expect, it } from 'vitest';

import { parseXhsInitialState } from '../functions/api/fetchXhsImageUrls';

describe('parseXhsInitialState', () => {
  it('normalizes undefined properties and empty Map instances from Xiaohongshu', () => {
    const serializedState =
      '{"note":{"noteDetailMap":{"post":{"note":{"title":"test","imageList":[]}}}},' +
      '"optional":undefined,"AiNoteDetailStore":{"noteDetailMap":new Map([])}}';

    expect(parseXhsInitialState(serializedState)).toEqual({
      note: {
        noteDetailMap: {
          post: {
            note: {
              title: 'test',
              imageList: [],
            },
          },
        },
      },
      optional: null,
      AiNoteDetailStore: {
        noteDetailMap: {},
      },
    });
  });
});
