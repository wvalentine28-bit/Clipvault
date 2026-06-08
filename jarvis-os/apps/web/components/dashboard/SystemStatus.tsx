"use client";

import useSWR from "swr";

export function SystemStatus() {
  const { data } = useSWR(
    `${process.env.NEXT_PUBLIC_API_URL}/health`,
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 30000 }
  );

  const services = data?.services || {};

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-card/50 border border-border rounded-lg text-xs hud-text overflow-x-auto">
      <span className="text-muted-foreground whitespace-nowrap">SYSTEM STATUS</span>
      {Object.entries(services).map(([name, info]: [string, any]) => (
        <span key={name} className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              info.status === "up" ? "bg-green-400" : "bg-red-400"
            }`}
          />
          <span className="text-muted-foreground">{name.toUpperCase()}</span>
          <span
            className={
              info.status === "up" ? "text-green-400" : "text-red-400"
            }
          >
            {info.status === "up" ? "ONLINE" : "OFFLINE"}
          </span>
          {info.latencyMs && (
            <span className="text-muted-foreground">{info.latencyMs}ms</span>
          )}
        </span>
      ))}
      {Object.keys(services).length === 0 && (
        <span className="text-muted-foreground">CONNECTING...</span>
      )}
    </div>
  );
}
