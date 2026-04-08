export interface ActionItem {
  owner: string | null;
  task: string;
  due: string | null;
}

export interface MeetingSummary {
  summary: string;
  key_points: string[];
  decisions: string[];
  action_items: ActionItem[];
}

export interface Meeting {
  _id?: string;
  title: string;
  transcript: string;
  summary: MeetingSummary;
  durationSeconds?: number;
  createdAt: Date;
}
