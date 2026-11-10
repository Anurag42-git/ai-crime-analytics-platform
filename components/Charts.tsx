"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function TrendChart({ data }: { data: { month: string; count: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#0F1F4B", border: "1px solid #ffffff22", borderRadius: 12 }} />
          <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const COLORS = ["#3b82f6", "#f59e0b", "#ef4444", "#22c55e", "#a78bfa", "#06b6d4"];

export function TypeDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ background: "#0F1F4B", border: "1px solid #ffffff22", borderRadius: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HourlyHeat({ data }: { data: { hour: number; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="grid grid-cols-12 gap-1.5">
      {data.map((d) => (
        <div key={d.hour} className="rounded-lg border border-white/10 p-2 text-center"
          style={{ background: `rgba(37,99,235,${0.08 + (d.count / max) * 0.7})` }}
          title={`${d.hour}:00 — ${d.count} crimes`}>
          <p className="text-[10px] font-bold">{d.hour}h</p>
          <p className="text-[11px] text-slate-200">{d.count}</p>
        </div>
      ))}
    </div>
  );
}
