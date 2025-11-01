

"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Label, Legend } from 'recharts';
import { Star, ChevronsUpDown, Download, XCircle } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { ElectricalDataPoint, getParameterMetadata } from '@/lib/dummy-data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import html2canvas from 'html2canvas';
import { Switch } from '@/components/ui/switch';
import { Label as SwitchLabel } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';


type YAxisScale = 'linear' | 'log';

const getDynamicYAxisDomain = (param: string, dataMin: number, dataMax: number): [number | string, number | string] => {
    const lowerParam = param.toLowerCase();
    
    if (lowerParam.includes('voltage')) return [220, 240];
    if (lowerParam.includes('current')) return [0, 100];
    if (lowerParam.includes('active power')) return [0, 30];
    if (lowerParam.includes('reactive power')) return [0, 15];
    if (lowerParam.includes('apparent power')) return [0, 33];
    if (lowerParam.includes('power factor')) return [0.8, 1.0];

    // Fallback with 10% padding
    const padding = (dataMax - dataMin) * 0.1;
    const finalMin = dataMin - padding;
    const finalMax = dataMax + padding;
    return [finalMin < 0 && dataMin >= 0 ? 0 : finalMin, finalMax];
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Time
            </span>
            <span className="font-bold text-muted-foreground">
              {data.originalTime}
            </span>
          </div>
          {payload.map((p: any, index: number) => (
             <div className="flex flex-col" key={`${p.dataKey}-${index}`}>
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                    {p.name}
                </span>
                <span className="font-bold" style={{color: p.color}}>
                    {Number(p.value).toFixed(2)}
                </span>
             </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

const formatTimeTick = (tick: number) => {
    const date = new Date(tick);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const getHourTicks = () => {
    const ticks = [];
    for (let i = 0; i < 24; i++) {
        ticks.push(i * 3600 * 1000);
    }
    return ticks;
};

export default function MainChart({ dataset, availableParameters }: { dataset: ElectricalDataPoint[], availableParameters: string[] }) {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [isChartOpen, setIsChartOpen] = useState(true);

  const [selectedParam, setSelectedParam] = useLocalStorage<string>('selectedParam', '');
  const [selectedParamSecondary, setSelectedParamSecondary] = useLocalStorage<string | 'None'>('selectedParamSecondary', 'None');
  const [isCompareMode, setIsCompareMode] = useLocalStorage('isCompareMode', false);
  const [yAxisScale, setYAxisScale] = useLocalStorage<YAxisScale>('yAxisScale', 'linear');
  const [yAxisRange, setYAxisRange] = useLocalStorage<{min: number | string, max: number | string}>('yAxisRange', {min: 'auto', max: 'auto'});
  const [favorites, setFavorites] = useLocalStorage<string[]>('favorites', ['Average phase voltage', 'Power factor', 'Active power']);

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (availableParameters.length > 0) {
        if (!selectedParam || !availableParameters.includes(selectedParam)) {
          setSelectedParam(availableParameters[0]);
        }
        if (selectedParamSecondary !== 'None' && !availableParameters.includes(selectedParamSecondary)) {
          setSelectedParamSecondary('None');
        }
    } else {
        setSelectedParam('');
        setSelectedParamSecondary('None');
    }
  }, [availableParameters, selectedParam, setSelectedParam, selectedParamSecondary, setSelectedParamSecondary]);

  const toggleFavorite = useCallback((param: string) => {
    if (!param) return;
    setFavorites(prev => 
      prev.includes(param) ? prev.filter(p => p !== param) : [...prev, param]
    );
  }, [setFavorites]);

  const handleDownloadImage = useCallback(() => {
    if (chartRef.current) {
      toast({
        title: "Preparing image...",
        description: "Your chart image is being generated.",
      });
      const link = document.createElement('a');
      html2canvas(chartRef.current, { 
        useCORS: true,
        backgroundColor: theme === 'dark' ? '#0A2540' : '#FFFFFF',
      }).then((canvas) => {
        const image = canvas.toDataURL('image/png');
        const fileName = `circuitview_chart_${selectedParam.toString().replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
        link.href = image;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
          title: "Image Downloaded",
          description: `Chart saved as "${fileName}".`,
        });
      });
    } else {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not find the chart to download.",
        })
    }
  }, [selectedParam, toast, theme]);

  const handleDownloadSummary = useCallback(() => {
    if (!dataset || dataset.length === 0) {
      toast({ variant: "destructive", title: "No data to summarize" });
      return;
    }
    const values = dataset.map(d => d[selectedParam as string] as number).filter(v => v !== undefined && !isNaN(v));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const primaryMeta = getParameterMetadata(selectedParam as string);

    let summaryContent = [
      `Summary Report for: ${selectedParam}`,
      `Data Points: ${dataset.length}`,
      '---',
      `Minimum: ${min.toFixed(2)} ${primaryMeta.unit}`,
      `Maximum: ${max.toFixed(2)} ${primaryMeta.unit}`,
      `Average: ${avg.toFixed(2)} ${primaryMeta.unit}`,
    ].join('\n');
    
    if (isCompareMode && selectedParamSecondary && selectedParamSecondary !== 'None') {
        const secondaryValues = dataset.map(d => d[selectedParamSecondary as string] as number).filter(v => v !== undefined && !isNaN(v));
        const secondaryMin = Math.min(...secondaryValues);
        const secondaryMax = Math.max(...secondaryValues);
        const secondaryAvg = secondaryValues.reduce((sum, v) => sum + v, 0) / secondaryValues.length;
        const secondaryMeta = getParameterMetadata(selectedParamSecondary as string);
        summaryContent += '\n\n' + [
            `Secondary Parameter: ${selectedParamSecondary}`,
             '---',
            `Minimum: ${secondaryMin.toFixed(2)} ${secondaryMeta.unit}`,
            `Maximum: ${secondaryMax.toFixed(2)} ${secondaryMeta.unit}`,
            `Average: ${secondaryAvg.toFixed(2)} ${secondaryMeta.unit}`,
        ].join('\n');
    }

    const fileName = `circuitview_summary_${selectedParam.toString().replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    const blob = new Blob([summaryContent], { type: 'text/plain;charset=utf-t;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: `Your report "${fileName}" is downloading.`,
    });
  }, [dataset, selectedParam, toast, isCompareMode, selectedParamSecondary]);
  
  const handleYAxisRangeChange = (key: 'min' | 'max', value: string) => {
    const numValue = value === '' ? 'auto' : parseFloat(value);
    setYAxisRange(prev => ({ ...prev, [key]: numValue }));
  };

  const resetYAxisRange = () => {
    setYAxisRange({ min: 'auto', max: 'auto' });
  }

  const yAxisDomain = useMemo(() => {
    const { min, max } = yAxisRange;
    const hasCustomMin = min !== 'auto' && !isNaN(Number(min));
    const hasCustomMax = max !== 'auto' && !isNaN(Number(max));

    if (yAxisScale === 'log') return ['auto', 'auto'];

    // Manual override takes precedence
    if (hasCustomMin || hasCustomMax) {
        return [
            hasCustomMin ? Number(min) : 'dataMin',
            hasCustomMax ? Number(max) : 'dataMax'
        ];
    }
    
    // Dynamic scaling based on parameter
    if (selectedParam && dataset.length > 0) {
        const values = dataset.map(d => d[selectedParam as string] as number).filter(v => v !== undefined && !isNaN(v));
        if (values.length > 0) {
            const dataMin = Math.min(...values);
            const dataMax = Math.max(...values);
            return getDynamicYAxisDomain(selectedParam, dataMin, dataMax);
        }
    }

    return ['auto', 'auto'];
  }, [yAxisRange, yAxisScale, selectedParam, dataset]);
  
  const showCompare = isCompareMode && selectedParamSecondary && selectedParamSecondary !== 'None';
  const primaryMeta = getParameterMetadata(selectedParam as string);
  const secondaryMeta = showCompare ? getParameterMetadata(selectedParamSecondary as string) : null;
  const useDualAxis = showCompare && secondaryMeta && primaryMeta.unit !== secondaryMeta.unit;

  const ChartComponent = primaryMeta.chartType === 'line' ? LineChart : BarChart;
  const PrimaryChartElement = primaryMeta.chartType === 'line' ? Line : Bar;
  const SecondaryChartElement = secondaryMeta ? (secondaryMeta.chartType === 'line' ? Line : Bar) : null;

  const primaryColor = theme === 'dark' ? "hsl(var(--chart-1))" : "hsl(var(--primary))";
  const secondaryColor = theme === 'dark' ? "hsl(var(--chart-2))" : "hsl(var(--accent))";
  const textColor = "hsl(var(--foreground))";
  const mutedColor = "hsl(var(--muted-foreground))";
  
  if (!availableParameters || availableParameters.length === 0) {
    return (
      <section>
        <Card className="shadow-lg">
            <CardHeader>
                <p>Upload a CSV file to see your data.</p>
            </CardHeader>
        </Card>
      </section>
    );
  }

  return (
      <section>
          <Collapsible
            open={isChartOpen}
            onOpenChange={setIsChartOpen}
            className="w-full"
          >
            <Card className="shadow-lg">
              <CardHeader className="flex-col items-start gap-4 space-y-4">
                <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <Select value={selectedParam as string} onValueChange={(v) => setSelectedParam(v)}>
                        <SelectTrigger className="w-full md:w-[240px] text-base font-semibold">
                          <SelectValue placeholder="Primary Parameter" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableParameters.map((param, index) => (
                            <SelectItem key={`${param}-${index}`} value={param}>{param}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => toggleFavorite(selectedParam as string)}>
                              <Star className={cn("h-5 w-5", favorites.includes(selectedParam as string) ? "text-accent fill-accent" : "text-muted-foreground")} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{favorites.includes(selectedParam as string) ? 'Remove from favorites' : 'Add to favorites'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {isCompareMode && (
                          <Select value={selectedParamSecondary as string} onValueChange={(v) => setSelectedParamSecondary(v)}>
                              <SelectTrigger className="w-full md:w-[240px] text-base font-semibold">
                                  <SelectValue placeholder="Secondary Parameter" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="None">None</SelectItem>
                                  {availableParameters.filter(p => p !== selectedParam).map((param, index) => (
                                  <SelectItem key={`${param}-${index}-secondary`} value={param}>{param}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="compare-mode" checked={isCompareMode} onCheckedChange={(checked) => {
                          setIsCompareMode(checked);
                          if (!checked) {
                            setSelectedParamSecondary('None');
                          }
                        }} />
                        <SwitchLabel htmlFor="compare-mode">Compare Mode</SwitchLabel>
                      </div>
                    </div>
                </div>
                <div className="w-full flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-1">
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download Report</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleDownloadImage}>Download Graph as Image</DropdownMenuItem>
                          <DropdownMenuItem onClick={handleDownloadSummary}>Download Summary Report</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                   <div className="flex items-center gap-2">
                      <Select value={yAxisScale} onValueChange={(v) => setYAxisScale(v as YAxisScale)}>
                          <SelectTrigger className="w-full sm:w-[150px]">
                              <SelectValue placeholder="Y-Axis Scale" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="linear">Linear</SelectItem>
                              <SelectItem value="log">Logarithmic</SelectItem>
                          </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          placeholder="Min"
                          className="h-9 w-20"
                          value={yAxisRange.min === 'auto' ? '' : yAxisRange.min}
                          onChange={(e) => handleYAxisRangeChange('min', e.target.value)}
                          disabled={yAxisScale === 'log'}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          className="h-9 w-20"
                          value={yAxisRange.max === 'auto' ? '' : yAxisRange.max}
                          onChange={(e) => handleYAxisRangeChange('max', e.target.value)}
                          disabled={yAxisScale === 'log'}
                        />
                         <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={resetYAxisRange} disabled={(yAxisRange.min === 'auto' && yAxisRange.max === 'auto') || yAxisScale === 'log'}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Reset Y-Axis Range</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                  </div>

                  <div className="flex items-center gap-2">
                    
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <ChevronsUpDown className="h-4 w-4" />
                        <span className="sr-only">Toggle chart</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <div className="h-[500px] w-full" ref={chartRef}>
                    <ResponsiveContainer>
                      <ChartComponent data={dataset} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                          <XAxis
                              dataKey="time"
                              type="number"
                              domain={[0, 24 * 3600 * 1000]}
                              ticks={getHourTicks()}
                              tickFormatter={formatTimeTick}
                              stroke={mutedColor}
                              fontSize={12}
                          >
                              <Label 
                                  value="Time (24h format)" 
                                  position="bottom"
                                  offset={25}
                                  style={{ textAnchor: 'middle', fill: textColor }}
                              />
                          </XAxis>
                          <YAxis 
                              yAxisId="left"
                              scale={yAxisScale}
                              domain={yAxisDomain} 
                              allowDataOverflow={true}
                              stroke={primaryColor}
                              fontSize={12}
                              tickFormatter={(val) => `${Number(val).toFixed(1)}`}
                              width={80}
                          >
                            <Label 
                              value={`${selectedParam} ${primaryMeta.unit ? `(${primaryMeta.unit})` : ''}`}
                              angle={-90}
                              position="insideLeft" 
                              style={{ textAnchor: 'middle', fill: primaryColor }}
                            />
                          </YAxis>
                          {useDualAxis && secondaryMeta && (
                               <YAxis 
                                  yAxisId="right"
                                  orientation="right"
                                  scale={yAxisScale}
                                  domain={['auto','auto']}
                                  allowDataOverflow={true}
                                  stroke={secondaryColor}
                                  fontSize={12}
                                  tickFormatter={(val) => `${Number(val).toFixed(1)}`}
                                  width={80}
                              >
                                <Label 
                                  value={`${selectedParamSecondary} ${secondaryMeta.unit ? `(${secondaryMeta.unit})` : ''}`}
                                  angle={-90} 
                                  position="insideRight" 
                                  style={{ textAnchor: 'middle', fill: secondaryColor }}
                                />
                              </YAxis>
                          )}
                          <RechartsTooltip content={<CustomTooltip />} />
                          {showCompare && <Legend verticalAlign="top" height={36} wrapperStyle={{color: textColor}} />}
                          <PrimaryChartElement 
                              yAxisId="left"
                              type="monotone" 
                              dataKey={selectedParam as string} 
                              stroke={primaryColor} 
                              fill={primaryColor} 
                              strokeWidth={2.5} 
                              dot={false}
                              name={selectedParam as string}
                              connectNulls
                          />
                          {showCompare && SecondaryChartElement && selectedParamSecondary !== 'None' && (
                              <SecondaryChartElement
                                  yAxisId={useDualAxis ? "right" : "left"}
                                  type="monotone"
                                  dataKey={selectedParamSecondary as string}
                                  stroke={secondaryColor}
                                  fill={secondaryColor}
                                  strokeWidth={2.5}
                                  dot={false}
                                  name={selectedParamSecondary as string}
                                  connectNulls
                              />
                          )}
                      </ChartComponent>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
      </section>
  );
}
 
