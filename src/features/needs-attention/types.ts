export type NeedsAttentionItem = {
  id: string;
  name: string | null;
  phone: string;
  needsHumanReviewReason: string | null;
  needsHumanReviewAt: string | null;
  recentMessages: { role: string; content: string }[];
  upcomingAppointmentId: string | null;
};
