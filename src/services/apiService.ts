const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
  };
}

export interface MatchMessage {
  id: string;
  sender: 'self' | 'match';
  text: string;
  timestamp: string;
}

export interface VibeProfile {
  style: string;
  eq: number;
  summary: string;
  subcategory?: string;
  lookingFor?: string;
  preferredBadges?: string[];
  preferredTraits?: string[];
}

export interface MatchThread {
  id: string;
  name: string;
  age: number;
  job: string;
  distance: string;
  bio: string;
  badges: string[];
  compatibility: number;
  prompt: string;
  photos: string[];
  matchedAt: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  lastSeenMessageId?: string | null;
  messages: MatchMessage[];
}

export interface MatchCandidatePayload {
  id: string;
  name: string;
  age: number;
  job: string;
  distance: string;
  bio: string;
  badges: string[];
  compatibility: number;
  prompt: string;
  photos: string[];
}

export interface UserProfile {
  uid: string;
  firstName: string;
  age?: number;
  distance?: number;
  bio?: string;
  location?: string;
  interests?: string[];
  photos?: string[];
  matches?: MatchThread[];
  activeMatchId?: string | null;
  onboardingComplete: boolean;
  simulationComplete: boolean;
  matchFound: boolean;
  vibeScore?: VibeProfile;
  createdAt?: string;
}

interface CurrentUserResponse {
  user: {
    uid: string;
    email: string;
  };
  profile: UserProfile;
}

export const apiService = {
  async register(email: string, firstName: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, firstName, password }),
    });
    if (!response.ok) throw new Error('Registration failed');
    return response.json();
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  },

  async getCurrentUser(token: string): Promise<CurrentUserResponse> {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },

  async completeOnboarding(token: string, data: any): Promise<any> {
    const response = await fetch(`${API_URL}/api/profile/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to complete onboarding');
    return response.json();
  },

  async runVibeCheck(token: string): Promise<{ success: boolean; vibeScore: VibeProfile }> {
    const response = await fetch(`${API_URL}/api/simulation/vibe-check`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to run vibe check');
    return response.json();
  },

  async uploadProfilePhotos(token: string, files: File[]): Promise<{ success: boolean; photos: string[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await fetch(`${API_URL}/api/profile/photos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to upload profile photos');
    return response.json();
  },

  async updateProfilePhotos(token: string, photos: string[]): Promise<{ success: boolean; photos: string[] }> {
    const response = await fetch(`${API_URL}/api/profile/photos`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ photos }),
    });

    if (!response.ok) throw new Error('Failed to update profile photos');
    return response.json();
  },

  async createMatch(token: string, match: MatchCandidatePayload): Promise<{ success: boolean; match: MatchThread; isNew: boolean; activeMatchId: string | null }> {
    const response = await fetch(`${API_URL}/api/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(match),
    });

    if (!response.ok) throw new Error('Failed to create match');
    return response.json();
  },

  async activateMatch(token: string, matchId: string): Promise<{ success: boolean; activeMatchId: string | null }> {
    const response = await fetch(`${API_URL}/api/matches/${matchId}/activate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to activate match');
    return response.json();
  },

  async markMatchRead(token: string, matchId: string): Promise<{ success: boolean; match?: MatchThread; activeMatchId: string | null }> {
    const response = await fetch(`${API_URL}/api/matches/${matchId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to mark match read');
    return response.json();
  },

  async sendMatchMessage(token: string, matchId: string, text: string): Promise<{ success: boolean; match: MatchThread; activeMatchId: string | null }> {
    const response = await fetch(`${API_URL}/api/matches/${matchId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) throw new Error('Failed to send match message');
    return response.json();
  },

  async simulateMatchReply(token: string, matchId: string): Promise<{ success: boolean; match: MatchThread; activeMatchId: string | null }> {
    const response = await fetch(`${API_URL}/api/matches/${matchId}/simulate-reply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to simulate match reply');
    return response.json();
  },

  async sendMessage(token: string, senderId: string, text: string, isAi: boolean): Promise<any> {
    const response = await fetch(`${API_URL}/api/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ senderId, text, isAi }),
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  },

  async getMessages(token: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/api/messages`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  },

  async completeSimulation(token: string): Promise<any> {
    const response = await fetch(`${API_URL}/api/simulation/complete`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to complete simulation');
    return response.json();
  },

  async markMatchFound(token: string): Promise<any> {
    const response = await fetch(`${API_URL}/api/match/found`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to mark match found');
    return response.json();
  },

  getAssetUrl(path: string): string {
    if (!path) return path;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    return `${API_URL}${path}`;
  },
};
