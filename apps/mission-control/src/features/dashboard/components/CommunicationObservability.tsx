import { MessageSquare } from "lucide-react";
import { Card } from "@/shared/components/ui";

export default function CommunicationObservability() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <MessageSquare size={18} />
        <h2 className="text-2xl font-semibold">Communication Observability</h2>
      </div>
      <p className="mt-2 text-sm text-white/40">
        Communication activity is now represented through the durable observability layer.
      </p>
    </Card>
  );
}
