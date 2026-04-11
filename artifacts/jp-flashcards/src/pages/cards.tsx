import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStageColor, getStageName, SRSStage } from "@/lib/srs";
import { 
  useListCards, 
  useUpdateCard, 
  useDeleteCard,
  getListCardsQueryKey,
  getGetDashboardQueryKey,
  FlashcardResponse
} from "@workspace/api-client-react";
import { Search, Edit2, Trash2, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Cards() {
  const queryClient = useQueryClient();
  const { data: cards = [], isLoading } = useListCards();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{japanese: string, reading: string, english: string}>({japanese: "", reading: "", english: ""});

  const handleDelete = (id: string) => {
    if (confirm("Delete this card?")) {
      deleteCard.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCardsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        }
      });
    }
  };

  const handleEdit = (card: FlashcardResponse) => {
    setEditingId(card.id);
    setEditForm({
      japanese: card.japanese,
      reading: card.reading,
      english: card.english
    });
  };

  const handleSave = (card: FlashcardResponse) => {
    updateCard.mutate({
      id: card.id,
      data: {
        japanese: editForm.japanese,
        reading: editForm.reading,
        english: editForm.english
      }
    }, {
      onSuccess: () => {
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: getListCardsQueryKey() });
      }
    });
  };

  const filteredCards = cards.filter(c => 
    c.japanese.includes(search) || 
    c.english.toLowerCase().includes(search.toLowerCase()) || 
    c.reading.includes(search)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold">Vocabulary</h1>
            <p className="text-muted-foreground mt-2">Manage your collection of {cards.length} words.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search words..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card, i) => (
            <Card key={card.id} className="border-border shadow-sm bg-card hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
              <CardContent className="p-5">
                {editingId === card.id ? (
                  <div className="space-y-3">
                    <Input value={editForm.japanese} onChange={e => setEditForm({...editForm, japanese: e.target.value})} placeholder="Japanese" className="font-serif font-medium text-lg" />
                    <Input value={editForm.reading} onChange={e => setEditForm({...editForm, reading: e.target.value})} placeholder="Reading" />
                    <Input value={editForm.english} onChange={e => setEditForm({...editForm, english: e.target.value})} placeholder="English" />
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => handleSave(card)} className="flex-1" disabled={updateCard.isPending}><Check className="w-4 h-4 mr-1"/> Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4"/></Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <Badge className={`${getStageColor(card.srsStage as SRSStage)} border-none shadow-none text-xs font-medium px-2 py-0.5`}>
                        {getStageName(card.srsStage as SRSStage)}
                      </Badge>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(card)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(card.id)} disabled={deleteCard.isPending}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 mb-4">
                      {card.reading && <div className="text-sm text-muted-foreground font-serif">{card.reading}</div>}
                      <div className="text-2xl font-serif font-medium text-foreground">{card.japanese}</div>
                      <div className="text-primary font-medium mt-1">{card.english}</div>
                    </div>
                    <div className="text-xs text-muted-foreground pt-3 border-t border-border mt-auto flex justify-between">
                      <span>{card.totalReviews} reviews</span>
                      <span>
                        {card.nextReview > 0 
                          ? `Due ${card.nextReview <= Date.now() ? 'now' : formatDistanceToNow(card.nextReview, { addSuffix: true })}` 
                          : 'Not reviewed yet'}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
          {filteredCards.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No words found matching your search.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
