
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp } from 'lucide-react';
import { ElectricalDataPoint, fullDataset, getParameterMetadata } from '@/lib/dummy-data';
import { useToast } from '@/hooks/use-toast';
import MainChart from '@/components/dashboard/main-chart';
import FavoritesSection from '@/components/dashboard/favorites-section';
import Papa from 'papaparse';

const headerMapping: Record<keyof Omit<ElectricalDataPoint, 'index' | 'time' | 'originalTime'>, string[]> = {
    'R phase voltage': ['r phase voltage', 'voltage r'],
    'Y phase voltage': ['y phase voltage', 'voltage y'],
    'B phase voltage': ['b phase voltage', 'voltage b'],
    'Average phase voltage': ['average phase voltage', 'avg voltage'],
    'Power factor': ['power factor', 'pf'],
    'R phase line current': ['r phase line current', 'current r'],
    'Y phase line current': ['y phase line current', 'current y'],
    'B phase line current': ['b phase line current', 'current b'],
    'Neutral current': ['neutral current', 'n current'],
    'Active power': ['active power', 'kw'],
    'Reactive power': ['reactive power', 'kvar'],
    'Apparent power': ['apparent power', 'kva'],
};

const parseDateTimeToMilliseconds = (dateTimeStr: string): number => {
    if (!dateTimeStr || typeof dateTimeStr !== 'string') return NaN;

    const parts = dateTimeStr.split(' ');
    if (parts.length < 2) return NaN;

    const timePart = parts[1];
    const timeParts = timePart.split(':');
    if (timeParts.length < 2) return NaN;

    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        return NaN;
    }
    
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
};


export default function DashboardPage() {
  const [data, setData] = useState<ElectricalDataPoint[]>(fullDataset);
  const [availableParameters, setAvailableParameters] = useState<string[]>(Object.keys(getParameterMetadata('')).filter(k => k !== 'index' && k !== 'time' && k !== 'originalTime'));
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsLoading(true);
    toast({ title: 'Processing file...', description: 'Your data is being visualized.' });

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: ";",
        complete: (results) => {
            try {
                if (!results.data || results.data.length === 0) {
                    throw new Error("CSV file is empty or could not be parsed.");
                }

                if (results.errors.length > 0) {
                    console.error("Parsing errors:", results.errors);
                    // Find first critical error to display
                    const criticalError = results.errors.find(e => e.code !== 'TooFewFields' && e.code !== 'TooManyFields');
                    if (criticalError) {
                        throw new Error(`Parsing error on row ${criticalError.row}: ${criticalError.message}`);
                    }
                }

                const rawHeaders = results.meta.fields || [];

                const getMappedHeader = (header: string): string => {
                    const cleanHeader = header.trim().toLowerCase().replace(/^ioitsecure447>/, '');
                    for (const key in headerMapping) {
                        const typedKey = key as keyof typeof headerMapping;
                        if (headerMapping[typedKey].some(alias => cleanHeader.includes(alias))) {
                            return typedKey;
                        }
                    }
                    return cleanHeader; // Return cleaned header if no mapping found
                };

                let timeColumnHeader = '';
                const timeHeaderCandidates = ['time', 'timestamp', 'date'];
                for(const candidate of timeHeaderCandidates) {
                    const found = rawHeaders.find(h => h.toLowerCase().includes(candidate));
                    if (found) {
                        timeColumnHeader = found;
                        break;
                    }
                }

                if (!timeColumnHeader) {
                    throw new Error("Could not find a time column. Please ensure a column is named 'time' or 'timestamp'.");
                }

                const mappedHeaders = rawHeaders.map(h => ({ original: h, mapped: getMappedHeader(h) }));

                const parsedData = (results.data as any[]).map((row: any, index: number) => {
                    const dataPoint: Partial<ElectricalDataPoint> = { index };

                    const originalTime = row[timeColumnHeader];
                    dataPoint.originalTime = originalTime;
                    dataPoint.time = parseDateTimeToMilliseconds(originalTime);

                    if (isNaN(dataPoint.time)) return null;

                    for (const { original, mapped } of mappedHeaders) {
                        if (original === timeColumnHeader) continue;
                        
                        const rawValue = row[original];
                        // PapaParse might return numbers for numeric strings, handle both
                        const value = typeof rawValue === 'string' ? parseFloat(rawValue.replace(',', '.')) : rawValue;
                        if (rawValue !== null && rawValue !== undefined && !isNaN(value)) {
                            dataPoint[mapped] = value;
                        }
                    }
                    return dataPoint as ElectricalDataPoint;
                }).filter((row): row is ElectricalDataPoint => row !== null && !isNaN(row.time));
                
                // Sort the data by time
                parsedData.sort((a, b) => a.time - b.time);

                if (parsedData.length === 0) {
                    throw new Error("No valid data rows could be parsed from the CSV. Check time format (DD/MM/YYYY HH:MM:SS) and numeric values.");
                }

                const newAvailableParams = Array.from(new Set(
                    mappedHeaders
                        .map(h => h.mapped)
                        .filter(h => h !== getMappedHeader(timeColumnHeader) && parsedData.some(d => typeof d[h] === 'number'))
                ));

                if (newAvailableParams.length === 0) {
                    throw new Error("No valid numeric data columns could be found in the CSV file.");
                }

                setData(parsedData);
                setAvailableParameters(newAvailableParams);
                setIsLoading(false);
                toast({ title: 'Success!', description: `Visualizing data from ${file.name}` });

            } catch (error: any) {
                setIsLoading(false);
                toast({ 
                    variant: 'destructive', 
                    title: 'Parsing failed', 
                    description: error.message || 'Could not parse the CSV file. Please check the format and delimiter.' 
                });
            }
        },
        error: (error: any) => {
            setIsLoading(false);
            toast({ variant: 'destructive', title: 'Upload failed', description: error.message || 'Could not read the file.' });
        }
    });
  }, [toast]);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  const filteredData = useMemo(() => {
    return data.filter(d => 
      d.time !== null && d.time !== undefined && !isNaN(Number(d.time)) &&
      d.originalTime !== null && d.originalTime !== undefined && String(d.originalTime).trim() !== ''
    );
  }, [data]);

  
  const dataset = filteredData.length > 0 ? filteredData : [];

  return (
    <div className="flex flex-col gap-8">
       <section>
        <Card>
            <CardHeader>
                <CardTitle>Upload Data</CardTitle>
                <CardDescription>
                    Upload a new semicolon-delimited (;) CSV file to visualize its data. This will replace the current view.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div {...getRootProps()}>
                    <input {...getInputProps()} />
                    <Button 
                        onClick={open} 
                        disabled={isLoading}
                        className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-md transition-shadow hover:shadow-lg"
                    >
                        {isLoading ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <FileUp className="mr-2 h-5 w-5" />
                                Upload CSV
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
      </section>

      <MainChart dataset={dataset} availableParameters={availableParameters}/>

      <FavoritesSection dataset={dataset} availableParameters={availableParameters} />
    </div>
  );
}
 
