
"use client";

import React, { useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label as SwitchLabel } from '@/components/ui/label';
import { Zap, ListPlus } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { ElectricalDataPoint } from '@/lib/dummy-data';
import MiniChart from './mini-chart';


export default function FavoritesSection({ dataset, availableParameters }: { dataset: ElectricalDataPoint[], availableParameters: string[] }) {
    const [favorites, setFavorites] = useLocalStorage<string[]>('favorites', ['Average phase voltage', 'Power factor', 'Active power']);
    
    useEffect(() => {
        // Filter out favorites that are not in the current dataset's parameters
        if (availableParameters.length > 0) {
            setFavorites(prev => prev.filter(fav => availableParameters.includes(fav)));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(availableParameters)]);

    const toggleFavorite = useCallback((param: string) => {
        setFavorites(prev => 
        prev.includes(param) ? prev.filter(p => p !== param) : [...prev, param]
        );
    }, [setFavorites]);

    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline text-2xl font-bold text-primary">Favorites</h2>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="shadow">
                            <ListPlus className="mr-2 h-4 w-4"/>
                            Customize Favorites
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Customize Your Favorites</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-72">
                            <div className="grid gap-4 py-4">
                                {availableParameters.map((param, index) => (
                                    <div key={`${param}-${index}`} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <SwitchLabel htmlFor={`fav-${param}-${index}`} className="font-medium text-sm">
                                            {param}
                                        </SwitchLabel>
                                        <Switch
                                            id={`fav-${param}-${index}`}
                                            checked={favorites.includes(param)}
                                            onCheckedChange={() => toggleFavorite(param)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>

            {favorites.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {favorites.filter(fav => availableParameters.includes(fav)).map(fav => (
                        <MiniChart key={fav} parameter={fav} data={dataset} />
                    ))}
                </div>
            ) : (
                <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
                    <Zap className="h-10 w-10 text-muted-foreground mb-4"/>
                    <p className="font-semibold">No Favorites Yet</p>
                    <p className="text-sm text-muted-foreground">Select parameters from your CSV and click the star icon to add favorites.</p>
                </Card>
            )}
        </section>
    );
}
