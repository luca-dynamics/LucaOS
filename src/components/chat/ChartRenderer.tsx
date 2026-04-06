import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

interface ChartRendererProps {
  data: any[];
  type?: "bar" | "line" | "area";
  themeColor: string;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({
  data,
  type = "bar",
  themeColor,
}) => {
  if (!data || data.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="p-3 rounded-lg border shadow-xl glass-blur"
          style={{ 
            backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.8))",
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))"
          }}
        >
          <p 
            className="text-xs font-bold mb-1"
            style={{ color: "var(--app-text-main, #ffffff)" }}
          >
             {label}
          </p>
          <p className="text-[10px] font-mono" style={{ color: themeColor }}>
            Value: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (type) {
      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-border-main, #1e293b)" />
            <XAxis 
              dataKey="name" 
              hide 
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Line 
               type="monotone" 
               dataKey="value" 
               stroke={themeColor} 
               strokeWidth={2}
               dot={{ r: 4, fill: themeColor, strokeWidth: 0 }}
               activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-border-main, #1e293b)" />
            <XAxis dataKey="name" hide />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={themeColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area 
               type="monotone" 
               dataKey="value" 
               stroke={themeColor} 
               fillOpacity={1} 
               fill="url(#colorValue)" 
               strokeWidth={2}
            />
          </AreaChart>
        );
      case "bar":
      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-border-main, #1e293b)" />
            <XAxis dataKey="name" hide />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
               dataKey="value" 
               fill={themeColor} 
               radius={[4, 4, 0, 0]}
               opacity={0.8}
            />
          </BarChart>
        );
    }
  };

  return (
    <div 
      className="my-6 p-4 rounded-xl border animate-in fade-in slide-in-from-bottom-2 duration-500 glass-blur shadow-2xl"
      style={{
        borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
        backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.2))",
      }}
    >
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span 
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: "var(--app-text-muted, #94a3b8)" }}
        >
          Data Visualization // {type}
        </span>
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
          <div className="w-1 h-1 rounded-full animate-pulse delay-75" style={{ backgroundColor: themeColor }} />
          <div className="w-1 h-1 rounded-full animate-pulse delay-150" style={{ backgroundColor: themeColor }} />
        </div>
      </div>
    </div>
  );
};

export default ChartRenderer;
