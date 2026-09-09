import { Clock, MessageCircle, PhoneCall } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type RemindersExplainerProps = {
  vapiConnected: boolean;
};

/** Nothing in the dashboard explained when reminders fire or how the voice agent gets used —
 *  this is the answer, sitting right above the integrations it depends on. Describes current,
 *  fixed behavior only (see reminder-service.ts) — no toggle to change this timing exists yet,
 *  so this doesn't imply one. */
export function RemindersExplainer({ vapiConnected }: RemindersExplainerProps) {
  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle>How reminders and calls actually work</CardTitle>
        <CardDescription>
          This runs on its own once the integrations below are connected — nothing to schedule
          or trigger by hand.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-3">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-foreground">
            <span className="font-medium">24 hours before</span> every booked appointment, a
            WhatsApp text goes out automatically — needs WhatsApp connected below.
          </p>
        </div>
        <div className="flex gap-3">
          <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-foreground">
            <span className="font-medium">2 hours before</span>, another WhatsApp text goes out,
            {vapiConnected ? (
              <> and Cliain places an automated phone call to confirm — it uses the same number connected under Phone calls below.</>
            ) : (
              <> and, once Phone calls is connected below, an automated confirmation call goes out too.</>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            A background job checks for anything due every 5 minutes — there&apos;s no dashboard to
            trigger a reminder or call yourself, and this 24h / 2h timing is fixed for every
            clinic right now, not yet something you can change per clinic. Once Phone calls is
            connected, patients can also call your clinic&apos;s number directly at any time and
            reach the same booking assistant used on WhatsApp.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
