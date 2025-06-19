// Student related types
export interface IStudent {
  name: string;
  email: string;
  phoneNumber: string;
  codeforcesHandle: string;
  currentRating?: number;
  maxRating?: number;
  lastDataUpdate?: Date | null;
  emailNotificationsEnabled: boolean;
  reminderEmailCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Codeforces API types
export interface IContest {
  contestId: number;
  contestName: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds: number;
  relativeTimeSeconds?: number;
}

export interface ISubmission {
  id: number;
  contestId?: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: {
    contestId?: number;
    index: string;
    name: string;
    type: string;
    rating?: number;
    tags: string[];
  };
  author: {
    contestId?: number;
    members: Array<{
      handle: string;
    }>;
    participantType: string;
    ghost: boolean;
    startTimeSeconds?: number;
  };
  programmingLanguage: string;
  verdict: string;
  testset: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}