import { useState } from "react";
import { ChevronDown, ChevronRight, Terminal, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type Chunk = {
  source: string;
  score: number;
  preview: string;
};

type RAGDebugInfo = {
  prompt: string;
  chunks: Chunk[];
};

type RAGInspectorProps = {
  data: RAGDebugInfo | null;
  isOpen?: boolean;
};

export function RAGInspector({ data, isOpen: initialIsOpen = false }: RAGInspectorProps) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);

  if (!process.env.NEXT_PUBLIC_DEBUG_RAG || process.env.NEXT_PUBLIC_DEBUG_RAG !== "true") {
    return null;
  }

  if (!data) return null;

  return (
    <Card className="my-4 border-yellow-500/50 bg-yellow-950/10">
      <CardHeader 
        className="flex flex-row items-center space-y-0 py-3 cursor-pointer hover:bg-white/5"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-1 items-center gap-2">
          <Terminal className="h-4 w-4 text-yellow-500" />
          <CardTitle className="text-sm font-mono text-yellow-500">RAG Inspector</CardTitle>
          <Badge variant="outline" className="ml-2 border-yellow-500/50 text-yellow-500">
             {data.chunks.length} Chunks
          </Badge>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      
      {isOpen && (
        <CardContent className="space-y-4 pt-0">
            {/* Prompt Section */}
            <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Final Prompt</h4>
                <div className="rounded-md bg-black/50 p-2 font-mono text-xs text-green-400 overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {data.prompt}
                </div>
            </div>

            {/* Chunks Section */}
            <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                    <Database className="h-3 w-3" /> Retrieved Context
                </h4>
                <div className="space-y-2">
                    {data.chunks.map((chunk, i) => (
                        <div key={i} className="rounded border border-border/50 bg-background/50 p-2 text-xs">
                            <div className="flex justify-between mb-1">
                                <span className="font-semibold text-blue-400">{chunk.source}</span>
                                <span className="text-muted-foreground">Score: {chunk.score.toFixed(4)}</span>
                            </div>
                            <p className="text-muted-foreground line-clamp-2">{chunk.preview}</p>
                        </div>
                    ))}
                </div>
            </div>
        </CardContent>
      )}
    </Card>
  );
}
