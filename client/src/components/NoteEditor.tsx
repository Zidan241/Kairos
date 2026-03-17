import { useState, useEffect, useCallback, useRef } from 'react';
import { MarkdownEditorV2 } from '@/components/MarkdownEditorV2';
import { useSaveNote, useGetNote } from '@/hooks/useNotes';

interface NoteEditorProps {
  subtaskId: number;
}

/**
 * Self-contained note editor that loads, auto-saves (1s debounce),
 * and flushes on unmount / beforeunload.
 *
 * Remount with a new `key` when switching between subtasks.
 */
export function NoteEditor({ subtaskId }: NoteEditorProps) {
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);
  const { mutate: saveNote } = useSaveNote();
  const { data: noteData, isFetched } = useGetNote(subtaskId);

  const contentRef = useRef('');
  const lastSavedRef = useRef('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- seed local state once after fetch ----
  useEffect(() => {
    if (!isFetched || loaded) return;
    const value = noteData ?? '';
    setContent(value);
    contentRef.current = value;
    lastSavedRef.current = value;
    setLoaded(true);
  }, [isFetched, noteData, loaded]);

  // ---- persist helper ----
  const saveNow = useCallback(
    (text: string) => {
      if (text === lastSavedRef.current) return;
      lastSavedRef.current = text;
      saveNote(
        { id: subtaskId, content: text },
        { onError: () => { lastSavedRef.current = ''; } },
      );
    },
    [subtaskId, saveNote],
  );

  // ---- debounced change handler ----
  const handleChange = useCallback(
    (markdown: string) => {
      contentRef.current = markdown;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveNow(markdown), 1000);
    },
    [saveNow],
  );

  // ---- flush on unmount & beforeunload ----
  useEffect(() => {
    const flush = () => saveNow(contentRef.current);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      flush();
    };
  }, [saveNow]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return <MarkdownEditorV2 value={content} onChange={handleChange} />;
}
