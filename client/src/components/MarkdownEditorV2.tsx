import { useRef, useEffect } from 'react';
import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import './MarkdownEditorV2.css';

interface MarkdownEditorV2Props {
  value: string;
  onChange: (markdown: string) => void;
}

export function MarkdownEditorV2({ value, onChange }: MarkdownEditorV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const defaultValueRef = useRef(value);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const crepe = new Crepe({
      root: el,
      defaultValue: defaultValueRef.current,
      features: {
        [Crepe.Feature.ImageBlock]: false,
        [Crepe.Feature.Latex]: false,
        [Crepe.Feature.Table]: false,
        [Crepe.Feature.CodeMirror]: false,
      },
      featureConfigs: {
        [Crepe.Feature.Placeholder]: {
          text: 'Start writing...',
        },
      },
    });

    crepe.on((listener) => {
      listener.markdownUpdated((_, markdown) => {
        onChangeRef.current(markdown);
      });
    });

    crepe.create();
    crepeRef.current = crepe;

    return () => {
      crepe.destroy();
      crepeRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div ref={containerRef} className="flex-1 overflow-y-auto" />
    </div>
  );
}
