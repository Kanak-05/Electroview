
export type ElectricalDataPoint = {
  index: number;
  time: number;
  originalTime: string;
  'R phase voltage'?: number;
  'Y phase voltage'?: number;
  'B phase voltage'?: number;
  'Average phase voltage'?: number;
  'Power factor'?: number;
  'R phase line current'?: number;
  'Y phase line current'?: number;
  'B phase line current'?: number;
  'Neutral current'?: number;
  'Active power'?: number;
  'Reactive power'?: number;
  'Apparent power'?: number;
  [key: string]: number | undefined | string;
};

const defaultMetadata = { unit: '', chartType: 'line' } as const;

export const getParameterMetadata = (parameter: string) => {
    if (!parameter) return defaultMetadata;
    const lowerParam = parameter.toLowerCase();
    if (lowerParam.includes('voltage') || lowerParam.includes('v')) return { unit: 'V', chartType: 'line' };
    if (lowerParam.includes('current') || lowerParam.includes('a')) return { unit: 'A', chartType: 'line' };
    if (lowerParam.includes('active power') || lowerParam.includes('kw')) return { unit: 'kW', chartType: 'bar' };
    if (lowerParam.includes('reactive power') || lowerParam.includes('kvar')) return { unit: 'kVAR', chartType: 'bar' };
    if (lowerParam.includes('apparent power') || lowerParam.includes('kva')) return { unit: 'kVA', chartType: 'bar' };
    if (lowerParam.includes('power factor') || lowerParam.includes('pf')) return { unit: '', chartType: 'line' };
    return defaultMetadata;
};

const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

const formatTime = (date: Date) => {
    return date.toTimeString().split(' ')[0]; // HH:mm:ss
}

const timeToMilliseconds = (date: Date) => {
    return (date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds()) * 1000;
}

export const generateData = (points: number): ElectricalDataPoint[] => {
  const data: ElectricalDataPoint[] = [];
  const now = new Date();
  for (let i = 0; i < points; i++) {
    const pointDate = new Date(now.getTime() - (points - i) * 60000); // 1 point per minute
    
    // Simulating daily load curve (higher during the day)
    const hour = pointDate.getUTCHours();
    const loadFactor = (Math.sin((hour - 9) * Math.PI / 12) + 1) / 2; // Peaks around 3 PM

    const rVoltage = randomInRange(225, 235) + (Math.random() - 0.5) * 5;
    const yVoltage = randomInRange(225, 235) + (Math.random() - 0.5) * 5;
    const bVoltage = randomInRange(225, 235) + (Math.random() - 0.5) * 5;
    
    const rCurrent = randomInRange(10, 80) * loadFactor + randomInRange(0, 5);
    const yCurrent = randomInRange(10, 80) * loadFactor + randomInRange(0, 5);
    const bCurrent = randomInRange(10, 80) * loadFactor + randomInRange(0, 5);

    // Calculate Power based on V, I, and PF
    const pf = randomInRange(0.92, 0.99) - (1 - loadFactor) * 0.1;
    const activePower = (rVoltage * rCurrent + yVoltage * yCurrent + bVoltage * bCurrent) * pf / 1000; // to kW
    const apparentPower = (rVoltage * rCurrent + yVoltage * yCurrent + bVoltage * bCurrent) / 1000; // to kVA
    const reactivePower = Math.sqrt(Math.pow(apparentPower, 2) - Math.pow(activePower, 2));


    data.push({
      index: i,
      time: timeToMilliseconds(pointDate),
      originalTime: formatTime(pointDate),
      'R phase voltage': parseFloat(rVoltage.toFixed(2)),
      'Y phase voltage': parseFloat(yVoltage.toFixed(2)),
      'B phase voltage': parseFloat(bVoltage.toFixed(2)),
      'Average phase voltage': parseFloat(((rVoltage + yVoltage + bVoltage) / 3).toFixed(2)),
      'Power factor': parseFloat(pf.toFixed(2)),
      'R phase line current': parseFloat(rCurrent.toFixed(2)),
      'Y phase line current': parseFloat(yCurrent.toFixed(2)),
      'B phase line current': parseFloat(bCurrent.toFixed(2)),
      'Neutral current': parseFloat(randomInRange(1, 15).toFixed(2)),
      'Active power': parseFloat(Math.min(30, activePower).toFixed(2)),
      'Reactive power': parseFloat(Math.min(15, reactivePower).toFixed(2)),
      'Apparent power': parseFloat(Math.min(33, apparentPower).toFixed(2)),
    });
  }
  return data;
};

export const fullDataset = generateData(1440); // 1440 points = 24 hours of data at 1-minute intervals

    
