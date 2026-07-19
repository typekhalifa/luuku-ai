import { Card } from "@/shared/components/ui";

export default function SystemHealth() {
  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-semibold">
        System Health
      </h2>

      <div className="space-y-4">
        <div className="flex justify-between">
          <span>CPU</span>
          <span className="text-emerald-400">
            Healthy
          </span>
        </div>

        <div className="flex justify-between">
          <span>Memory</span>
          <span className="text-emerald-400">
            Healthy
          </span>
        </div>

        <div className="flex justify-between">
          <span>Database</span>
          <span className="text-emerald-400">
            Connected
          </span>
        </div>

        <div className="flex justify-between">
          <span>Queue</span>
          <span className="text-emerald-400">
            Running
          </span>
        </div>
      </div>
    </Card>
  );
}