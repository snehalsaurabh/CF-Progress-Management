import axios, { AxiosResponse } from 'axios';
import { IContest, ISubmission } from '../types/models';

export interface CodeforcesApiResponse<T> {
  status: string;
  result: T;
  comment?: string;
}

export interface CodeforcesUser {
  handle: string;
  email?: string;
  vkId?: string;
  openId?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  city?: string;
  organization?: string;
  contribution?: number;
  rank?: string;
  rating?: number;
  maxRank?: string;
  maxRating?: number;
  lastOnlineTimeSeconds?: number;
  registrationTimeSeconds?: number;
  friendOfCount?: number;
  avatar?: string;
  titlePhoto?: string;
}

export interface CodeforcesRatingChange {
  contestId: number;
  contestName: string;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

export class CodeforcesService {
  private static readonly BASE_URL = 'https://codeforces.com/api';
  private static readonly REQUEST_DELAY = 200; // 200ms delay between requests

  private static async makeRequest<T>(endpoint: string): Promise<T> {
    try {
      console.log(`🌐 Making Codeforces API request: ${this.BASE_URL}${endpoint}`);
      
      // Add delay to respect rate limiting
      await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY));
      
      const response: AxiosResponse<CodeforcesApiResponse<T>> = await axios.get(
        `${this.BASE_URL}${endpoint}`,
        {
          timeout: 15000, // 15 seconds timeout
          headers: {
            'User-Agent': 'CodeforcesProgressManager/1.0',
            'Accept': 'application/json'
          }
        }
      );

      console.log(`✅ API Response Status: ${response.data.status}`);

      if (response.data.status !== 'OK') {
        throw new Error(`Codeforces API error: ${response.data.comment || 'Unknown error'}`);
      }

      return response.data.result;
    } catch (error) {
      console.error(`❌ Codeforces API Error for ${endpoint}:`, error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          throw new Error('Invalid request parameters');
        } else if (error.response?.status === 503) {
          throw new Error('Codeforces API is temporarily unavailable');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout - Codeforces API is slow to respond');
        } else if (error.code === 'ENOTFOUND') {
          throw new Error('Cannot connect to Codeforces API - check your internet connection');
        }
      }
      throw new Error(`Failed to fetch data from Codeforces: ${(error as Error).message}`);
    }
  }

  /**
   * Get user information by handle
   */
  static async getUserInfo(handle: string): Promise<CodeforcesUser> {
    console.log(`📋 Fetching user info for: ${handle}`);
    const users = await this.makeRequest<CodeforcesUser[]>(`/user.info?handles=${handle}`);
    
    if (!users || users.length === 0) {
      throw new Error(`User '${handle}' not found`);
    }
    
    console.log(`✅ User info retrieved for ${handle}: Rating ${users[0].rating || 'N/A'}`);
    return users[0];
  }

  /**
   * Get user's rating changes (contest history)
   */
  static async getUserRatingChanges(handle: string): Promise<CodeforcesRatingChange[]> {
    try {
      console.log(`📈 Fetching rating changes for: ${handle}`);
      const ratingChanges = await this.makeRequest<CodeforcesRatingChange[]>(`/user.rating?handle=${handle}`);
      console.log(`✅ Found ${ratingChanges?.length || 0} rating changes for ${handle}`);
      return ratingChanges || [];
    } catch (error) {
      // If user has no rating changes, Codeforces returns an error
      if ((error as Error).message.includes('not found') || (error as Error).message.includes('rating')) {
        console.log(`ℹ️ No rating changes found for ${handle}`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Get user's submissions with optional filtering
   */
  static async getUserSubmissions(
    handle: string, 
    from?: number, 
    count?: number
  ): Promise<ISubmission[]> {
    let endpoint = `/user.status?handle=${handle}`;
    
    if (from !== undefined) {
      endpoint += `&from=${from}`;
    }
    
    if (count !== undefined) {
      endpoint += `&count=${count}`;
    }

    try {
      console.log(`📝 Fetching submissions for: ${handle}`);
      const submissions = await this.makeRequest<ISubmission[]>(endpoint);
      console.log(`✅ Found ${submissions?.length || 0} submissions for ${handle}`);
      return submissions || [];
    } catch (error) {
      // If user has no submissions, return empty array
      if ((error as Error).message.includes('not found')) {
        console.log(`ℹ️ No submissions found for ${handle}`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Get contest list
   */
  static async getContests(gym?: boolean): Promise<IContest[]> {
    let endpoint = '/contest.list';
    
    if (gym !== undefined) {
      endpoint += `?gym=${gym}`;
    }

    console.log(`🏆 Fetching contests list`);
    const contests = await this.makeRequest<IContest[]>(endpoint);
    console.log(`✅ Found ${contests?.length || 0} contests`);
    return contests || [];
  }

  /**
   * Validate if a handle exists
   */
  static async validateHandle(handle: string): Promise<boolean> {
    try {
      await this.getUserInfo(handle);
      return true;
    } catch (error) {
      console.log(`❌ Handle validation failed for: ${handle}`);
      return false;
    }
  }

  /**
   * Get user statistics (combines user info and rating changes)
   */
  static async getUserStats(handle: string): Promise<{
    user: CodeforcesUser;
    ratingChanges: CodeforcesRatingChange[];
    submissionsCount: number;
  }> {
    console.log(`📊 Fetching complete stats for: ${handle}`);
    
    const [user, ratingChanges, submissions] = await Promise.allSettled([
      this.getUserInfo(handle),
      this.getUserRatingChanges(handle),
      this.getUserSubmissions(handle, 1, 1) // Just get count
    ]);

    const userData = user.status === 'fulfilled' ? user.value : null;
    const ratingData = ratingChanges.status === 'fulfilled' ? ratingChanges.value : [];
    
    if (!userData) {
      throw new Error(`User '${handle}' not found`);
    }

    // Get total submissions count
    let totalSubmissions = 0;
    try {
      const allSubmissions = await this.getUserSubmissions(handle);
      totalSubmissions = allSubmissions.length;
    } catch (error) {
      console.warn(`Could not get submissions count for ${handle}:`, error);
    }

    console.log(`✅ Complete stats retrieved for ${handle}`);
    return {
      user: userData,
      ratingChanges: ratingData,
      submissionsCount: totalSubmissions
    };
  }
}

export default CodeforcesService;