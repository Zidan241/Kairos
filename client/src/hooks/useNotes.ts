import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "@/lib/api";
import { NoteListItem } from "@shared/types";

export function useNotesList() {
  return useQuery<NoteListItem[]>({
    queryKey: ['notes-list'],
    queryFn: notesApi.list,
  });
}

export function useGetNote(subtaskId: number) {
  return useQuery<string | null>({
    queryKey: ['note', subtaskId],
    queryFn: () => notesApi.get(subtaskId),
    enabled: !!subtaskId,
  });
}

// Fire-and-forget save — the API call survives component unmount (used by NoteEditor's
// flush-on-unmount pattern). onSuccess invalidation may not fire after unmount, but
// that's fine since the query refetches when the user navigates back.
export function useSaveNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      notesApi.save(id, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes-list'] }),
  });
}
