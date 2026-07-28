export type CompetitionStatus = "draft" | "published" | "completed" | "coming_soon" | "finished";

export interface Competition {
  id: string;
  title: string;
  slug: string;
  status: CompetitionStatus;
  description: string | null;
  rules: string[] | null;
  registration_start_date: string;
  registration_end_date: string;
  qualification_start_date: string | null;
  qualification_end_date: string | null;
  final_start_date: string | null;
  final_end_date: string | null;
  poster_url: string | null;
  category: string | null;
  registration_fee: string | null;
  prize_pool: string | null;
  registration_link: string | null;
  created_at: string;
  creator_id?: string;
  prizes?: any;
  winners?: any;
  organizerName?: string;
}

export interface CompetitionListItem {
  id: string;
  title: string;
  slug: string;
  status: CompetitionStatus;
  regStartDate: string;
  regEndDate: string;
  finalEndDate: string | null;
  posterUrl: string | null;
  participantCount: number;
  category: string | null;
  organizerName?: string;
}
