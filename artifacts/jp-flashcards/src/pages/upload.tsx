import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  useExtractVocabulary, 
  useCreateCard,
  getGetLessonCardsQueryKey,
  getGetDashboardQueryKey
} from "@workspace/api-client-react";
import { UploadCloud, Check, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface EditPair {
  id: string;
  japanese: string;
  reading: string;
  english: string;
  selected: boolean;
}

export default function Upload() {
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pairs, setPairs] = useState<EditPair[]>([]);
  const { mutate: extractVocab, isPending: isExtracting } = useExtractVocabulary();
  const createCard = useCreateCard();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file type", description: "Please upload an image.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      
      const base64 = result.split(',')[1];
      extractVocab({
        data: { imageBase64: base64, mimeType: file.type }
      }, {
        onSuccess: (data) => {
          setPairs(data.pairs.map(p => ({
            id: crypto.randomUUID(),
            japanese: p.japanese,
            reading: p.reading || "",
            english: p.english,
            selected: true
          })));
        },
        onError: () => {
          toast({ title: "Extraction failed", description: "Could not read vocabulary from image.", variant: "destructive" });
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const updatePair = (id: string, field: keyof EditPair, value: string | boolean) => {
    setPairs(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleAddSelected = async () => {
    const selected = pairs.filter(p => p.selected && p.japanese && p.english);
    if (selected.length === 0) return;

    try {
      for (const p of selected) {
        await createCard.mutateAsync({
          data: {
            japanese: p.japanese,
            reading: p.reading || "",
            english: p.english
          }
        });
      }
      
      queryClient.invalidateQueries({ queryKey: getGetLessonCardsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      
      toast({ title: "Added to deck", description: `Added ${selected.length} new words to your lessons queue.` });
      setPairs([]);
      setImagePreview(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to add some words.", variant: "destructive" });
    }
  };

  const addNewPairManually = () => {
    setPairs(prev => [...prev, {
      id: crypto.randomUUID(),
      japanese: "",
      reading: "",
      english: "",
      selected: true
    }]);
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-3xl mx-auto animate-in fade-in duration-500">
        <header>
          <h1 className="text-3xl font-serif font-bold">Add Vocabulary</h1>
          <p className="text-muted-foreground mt-2">Upload a screenshot of Japanese text or manga to extract vocabulary automatically.</p>
        </header>

        {!imagePreview ? (
          <div 
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent/50'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-serif text-lg font-medium mb-2">Drag and drop your image here</h3>
            <p className="text-sm text-muted-foreground mb-6">Supports JPG, PNG, WEBP</p>
            <Label htmlFor="image-upload" className="cursor-pointer">
              <Button asChild>
                <span>Browse Files</span>
              </Button>
            </Label>
            <input 
              id="image-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleChange} 
            />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                {isExtracting ? (
                  <>Extracting<span className="animate-pulse">...</span></>
                ) : (
                  <>Extracted Words</>
                )}
              </h2>
              <Button variant="outline" onClick={() => { setImagePreview(null); setPairs([]); }}>
                Clear Image
              </Button>
            </div>

            {isExtracting && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p>Analyzing ink...</p>
              </div>
            )}

            {!isExtracting && pairs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No vocabulary detected. Try another image or add manually.
              </div>
            )}

            {!isExtracting && pairs.length > 0 && (
              <div className="space-y-4">
                {pairs.map(pair => (
                  <Card key={pair.id} className={`transition-all ${pair.selected ? 'border-primary/30 shadow-sm' : 'opacity-60'}`}>
                    <CardContent className="p-4 flex gap-4 items-start">
                      <div className="pt-3">
                        <Checkbox 
                          checked={pair.selected} 
                          onCheckedChange={(c) => updatePair(pair.id, 'selected', c === true)} 
                        />
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Japanese</Label>
                          <Input 
                            value={pair.japanese} 
                            onChange={(e) => updatePair(pair.id, 'japanese', e.target.value)} 
                            className="font-serif text-lg"
                            placeholder="漢字"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Reading (Kana)</Label>
                          <Input 
                            value={pair.reading} 
                            onChange={(e) => updatePair(pair.id, 'reading', e.target.value)} 
                            placeholder="かんじ"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">English</Label>
                          <Input 
                            value={pair.english} 
                            onChange={(e) => updatePair(pair.id, 'english', e.target.value)} 
                            placeholder="Kanji"
                          />
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive pt-8" onClick={() => setPairs(prev => prev.filter(p => p.id !== pair.id))}>
                        <X className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-between items-center pt-4">
                  <Button variant="outline" onClick={addNewPairManually}>
                    <Plus className="w-4 h-4 mr-2" /> Add Row
                  </Button>
                  <Button onClick={handleAddSelected} size="lg" className="bg-primary hover:bg-primary/90" disabled={createCard.isPending}>
                    {createCard.isPending ? <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Add {pairs.filter(p => p.selected).length} Words to Deck
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
