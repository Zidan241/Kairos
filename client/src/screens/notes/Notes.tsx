import { useState, useEffect } from 'react';
import { NoteEditor } from '@/components/NoteEditor';
import { FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { useSaveNote, useNotesList } from '@/hooks/useNotes';

export default function Notes() {
  // wouter hash-location puts search params in window.location.search.
  // The param may linger after navigation but is harmless — it just re-selects the same note.
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const v = new URLSearchParams(window.location.search).get('subtaskId');
    return v ? Number(v) : null;
  });
  const [search, setSearch] = useState('');
  const { mutate: saveNote } = useSaveNote();

  const { data: notesList = [], isFetched } = useNotesList();

  // If navigated here with a subtaskId that isn't in the list yet (first-time note),
  // ensure the DB entry exists so it appears in the sidebar.
  useEffect(() => {
    if (!selectedId || !isFetched) return;
    if (!notesList.find((n) => n.id === selectedId)) {
      saveNote({ id: selectedId, content: '' });
    }
  }, [selectedId, notesList, isFetched, saveNote]);

  const filtered = notesList.filter((n) => {
    const q = search.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.parentTaskTitle.toLowerCase().includes(q);
  });

  // Auto-select first item only if no initial selection
  useEffect(() => {
    if (selectedId === null && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r flex flex-col bg-muted/20">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {notesList.length === 0 ? 'No notes yet' : 'No matches'}
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left px-3 py-2.5 border-b transition-colors ${
                  selectedId === item.id
                    ? 'bg-accent'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="text-sm font-medium truncate">{item.title}</div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-muted-foreground truncate">{item.parentTaskTitle}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-w-0">
        {selectedId ? (
          <NoteEditor key={selectedId} subtaskId={selectedId} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a note to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
