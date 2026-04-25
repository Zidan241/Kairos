import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { NoteEditor } from './NoteEditor';
import { FileText, Expand } from 'lucide-react';
import { useLocation } from 'wouter';

interface NotesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtaskId: number;
  subtaskTitle: string;
}

export function NotesPanel({ open, onOpenChange, subtaskId, subtaskTitle }: NotesPanelProps) {
  const [, navigate] = useLocation();

  const handleExpand = () => {
    onOpenChange(false);
    navigate(`/notes?subtaskId=${subtaskId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] sm:max-w-[500px] flex flex-col gap-0 p-0 outline-none [&>button:last-child]:hidden">
        <SheetHeader className="flex flex-row items-center justify-between px-3 py-4 border-b space-y-0 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm font-medium min-w-0">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{subtaskTitle}</span>
          </SheetTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExpand}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Open in Notes page"
            >
              <Expand className="h-3.5 w-3.5" />
            </Button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          {open && <NoteEditor key={subtaskId} subtaskId={subtaskId} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
