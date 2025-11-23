/**
 * 笔记默认值配置
 * 定义创建新笔记时的默认内容
 */

import type { JSONContent } from '@tiptap/core'

/**
 * 新笔记的默认内容
 */
export const DEFAULT_CONTENT: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '欢迎使用 K 预记 ✨' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '开始你的第一篇行情笔记吧。' }],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '输入 / 呼出命令菜单' }],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: '聚焦后按 ' },
                { type: 'text', marks: [{ type: 'code' }], text: 'cmd + b' },
                { type: 'text', text: ' 进行加粗' },
              ],
            },
          ],
        },
      ],
    },
  ],
}

