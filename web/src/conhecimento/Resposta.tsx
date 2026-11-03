import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { CharacterCount } from '@tiptap/extensions'
import { EditorContent, useEditor } from '@tiptap/react'
import { useRef } from 'react'
import { Label } from '../ui/label'

// Texto puro (door 14): só documento, parágrafo e texto, sem marca; o que se grava é o `getText`, a fonte da conferência literal (AD-012).
export function Resposta({ valor, aoMudar }: { valor: string; aoMudar: (texto: string) => void }) {
  const ultimo = useRef(aoMudar) // o editor guarda o onUpdate da criação; a ref entrega sempre o do último render
  ultimo.current = aoMudar
  const editor = useEditor({
    extensions: [Document, Paragraph, Text, CharacterCount.configure({ limit: 8000 })],
    content: { type: 'doc', content: valor.split('\n').map((l) => ({ type: 'paragraph', content: l ? [{ type: 'text', text: l }] : [] })) },
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': 'resposta-artigo-rotulo',
        class: 'min-h-[6lh] max-h-[16lh] overflow-y-auto rounded-md border border-input px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm',
      },
    },
    onUpdate: ({ editor }) => ultimo.current(editor.getText({ blockSeparator: '\n' })),
  })
  return (
    <div className="flex flex-col gap-2">
      <Label id="resposta-artigo-rotulo" onClick={() => editor.commands.focus()}>
        Resposta
      </Label>
      <EditorContent editor={editor} />
    </div>
  )
}
