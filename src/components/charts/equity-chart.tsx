"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineSeries,
  UTCTimestamp,
  ColorType,
  CrosshairMode,
  TickMarkType,
} from "lightweight-charts";
import type { AccountData } from "@/types";
import { MODE_CONFIG } from "@/config/constants";

/** Format Unix timestamp (seconds) in local time for chart axis/crosshair */
const MAX_CHART_POINTS = 8000; // Downsample above this to keep full range without lag

function downsample<T extends { time: number }>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data;
  const step = (data.length - 1) / (maxPoints - 1);
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const idx = i === maxPoints - 1 ? data.length - 1 : Math.round(i * step);
    out.push(data[idx]);
  }
  return out;
}

function formatLocalTick(time: number, tickMarkType: TickMarkType): string {
  const d = new Date(time * 1000);
  switch (tickMarkType) {
    case TickMarkType.Year:
      return d.toLocaleDateString(undefined, { year: "numeric" });
    case TickMarkType.Month:
      return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    case TickMarkType.DayOfMonth:
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    case TickMarkType.TimeWithSeconds:
      return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    case TickMarkType.Time:
    default:
      return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
}

interface EquityChartProps {
  accounts: Record<string, AccountData>;
}

export function EquityChart({ accounts }: EquityChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const initialRangeSet = useRef(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#64748b",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.5)" },
        horzLines: { color: "rgba(30, 41, 59, 0.5)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: "#1e293b",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        tickMarkFormatter: (time, tickMarkType) =>
          formatLocalTick(Number(time), tickMarkType),
      },
      localization: {
        timeFormatter: (time) => new Date(Number(time) * 1000).toLocaleString(),
      },
      handleScroll: { vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 280,
    });

    chartRef.current = chart;
    initialRangeSet.current = false;

    const newSeries = new Map<string, ISeriesApi<"Line">>();
    for (const [mode, cfg] of Object.entries(MODE_CONFIG)) {
      const acct = accounts[mode];
      if (!acct) continue;
      const series = chart.addSeries(LineSeries, {
        color: cfg.color,
        lineWidth: 2,
        title: acct.label,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
        crosshairMarkerVisible: true,
        lastValueVisible: true,
      });
      newSeries.set(mode, series);
    }
    seriesRefs.current = newSeries;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height: height || 280 });
      }
    });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    let hasData = false;
    for (const [mode] of Object.entries(MODE_CONFIG)) {
      const acct = accounts[mode];
      const series = seriesRefs.current.get(mode);
      if (!acct || !series) continue;

      const history = acct.equity_history || [];
      if (history.length === 0) continue;
      hasData = true;

      let data = history
        .map((pt) => ({
          time: pt.ts as UTCTimestamp,
          value: pt.equity,
        }))
        .sort((a, b) => a.time - b.time);
      data = downsample(data, MAX_CHART_POINTS);

      series.setData(data);
    }

    if (hasData && !initialRangeSet.current && chartRef.current) {
      initialRangeSet.current = true;
      try {
        chartRef.current.timeScale().fitContent();
      } catch {
        // ignore
      }
    }
  }, [accounts]);

  return <div ref={chartContainerRef} className="chart-container" />;
}
