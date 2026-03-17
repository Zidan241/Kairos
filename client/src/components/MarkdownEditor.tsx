import { useRef, useCallback } from 'react';
import { Editor, rootCtx, defaultValueCtx, serializerCtx } from '@milkdown/core';
import { $prose } from '@milkdown/utils';
import {
  commonmark,
  toggleStrongCommand,
  toggleEmphasisCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  wrapInBlockquoteCommand,
  insertHrCommand,
} from '@milkdown/preset-commonmark';
import { gfm, toggleStrikethroughCommand } from '@milkdown/preset-gfm';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { callCommand } from '@milkdown/utils';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Minus,
} from 'lucide-react';

// --- Toolbar ---

function Toolbar() {
  const [loading, getInstance] = useInstance();

  const runCommand = useCallback(
    (cmd: any) => {
      if (loading) return;
      getInstance()?.action(callCommand(cmd));
    },
    [loading, getInstance],
  );

  const btn = (icon: React.ReactNode, cmd: any, title: string) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        runCommand(cmd);
      }}
    >
      {icon}
    </Button>
  );

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b bg-muted/30 flex-wrap">
      {btn(<Bold className="h-3.5 w-3.5" />, toggleStrongCommand.key, 'Bold')}
      {btn(<Italic className="h-3.5 w-3.5" />, toggleEmphasisCommand.key, 'Italic')}
      {btn(<Strikethrough className="h-3.5 w-3.5" />, toggleStrikethroughCommand.key, 'Strikethrough')}
      <Separator orientation="vertical" className="h-4 mx-1" />
      {btn(<List className="h-3.5 w-3.5" />, wrapInBulletListCommand.key, 'Bullet list')}
      {btn(<ListOrdered className="h-3.5 w-3.5" />, wrapInOrderedListCommand.key, 'Ordered list')}
      {btn(<Quote className="h-3.5 w-3.5" />, wrapInBlockquoteCommand.key, 'Blockquote')}
      <Separator orientation="vertical" className="h-4 mx-1" />
      {btn(<Minus className="h-3.5 w-3.5" />, insertHrCommand.key, 'Horizontal rule')}
    </div>
  );
}

// --- Editor inner ---

function MilkdownEditorInner({ defaultValue, onChange }: { defaultValue: string; onChange: (md: string) => void }) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const defaultValueRef = useRef(defaultValue);

  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, defaultValueRef.current);
      })
      .use(commonmark)
      .use(gfm)
      .use($prose(() => {
        const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", "`": "`" };
        return new Plugin({
          key: new PluginKey('autoBracket'),
          props: {
            handleTextInput(view, from, to, text) {
              const close = pairs[text];
              if (!close) return false;
              const { tr } = view.state;
              tr.insertText(text + close, from, to);
              tr.setSelection(TextSelection.create(tr.doc, from + 1));
              view.dispatch(tr);
              return true;
            },
          },
        });
      }))
      .use($prose((ctx) =>
        new Plugin({
          key: new PluginKey('onChange'),
          view: () => ({
            update: (view, prevState) => {
              if (view.state.doc.eq(prevState.doc)) return;
              requestAnimationFrame(() => {
                try {
                  onChangeRef.current(ctx.get(serializerCtx)(view.state.doc));
                } catch {
                  // editor may be destroyed
                }
              });
            },
          }),
        }),
      )),
    [],
  );

  return <Milkdown />;
}

// --- Public component ---

interface MarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  return (
    <MilkdownProvider>
      <div className="milkdown-editor flex flex-col h-full">
        <Toolbar />
        <div className="flex-1 overflow-y-auto px-3 py-3 prose dark:prose-invert prose-sm max-w-none [&_.milkdown]:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[300px]">
          <MilkdownEditorInner defaultValue={value} onChange={onChange} />
        </div>
      </div>
    </MilkdownProvider>
  );
}
