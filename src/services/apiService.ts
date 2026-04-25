const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
  };
}

interface UserProfile {
  uid: string;
  firstName: string;
  age?: number;
  distance?: number;
  onboardingComplete: boolean;
  simulationComplete: boolean;
  matchFound: boolean;
  vibeScore?: any;
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
};
