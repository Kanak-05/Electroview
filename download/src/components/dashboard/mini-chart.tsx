
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis } from 'recharts';
import { ElectricalDataPoint, getParameterMetadata } from '@/lib/dummy-data';
import { useTheme } from 'next-themes';

const MiniChart = React.memo(({ parameter, data }: { parameter: string, data: ElectricalDataPoint[] }) => {
  const { theme } = useTheme();
  const { unit, chartType } = getParameterMetadata(parameter);
  const ChartComponent = chartType === 'line' ? LineChart : BarChart;
  const ChartElement = chartType === 'line' ? Line : Bar;

  const chartColor = theme === 'dark' ? "hsl(var(--chart-1))" : "hsl(var(--primary))";

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="p-4">
        <CardTitle className="text-base font-medium">{parameter}</CardTitle>
        <CardDescription>{unit}</CardDescription>
      </CardHeader>
      <CardContent className="h-24 p-0">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={data} >
             <XAxis dataKey="time" hide />
            <ChartElement
              type="monotone"
              dataKey={parameter}
              stroke={chartColor}
              fill={chartColor}
              strokeWidth={2}
              dot={false}
            />
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
MiniChart.displayName = 'MiniChart';

export default MiniChart;
