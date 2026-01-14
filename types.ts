
export interface GroundingSource {
  title: string;
  uri: string;
}

export interface MapSource {
  title: string;
  uri: string;
  address?: string;
}

export interface AnalysisResult {
  content: string;
  confidence: {
    score: number;
    label: string;
  };
  language: string;
  sources: GroundingSource[];
}

export interface DoctorSearchResult {
  content: string;
  mapSources: MapSource[];
}

export interface HistoryItem {
  id: string;
  symptoms: string;
  timestamp: number;
  result: AnalysisResult;
}
