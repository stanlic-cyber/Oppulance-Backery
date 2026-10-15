import { AuthRole } from "../components/AuthScreens";

export interface UserProfile {
  uid: string;
  email: string;
  password?: string; // Only stored locally for dev mode
  role: AuthRole;
  status: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  province: string;
  district: string;
  ward: string;
  createdAt: string;
  updatedAt: string;
  businessDetails?: any;
}

const USERS_KEY = "nc_dev_users";
const CURRENT_USER_KEY = "nc_dev_current_user";

export const authService = {
  // Get all registered users from local storage
  getUsers: (): UserProfile[] => {
    try {
      const usersStr = localStorage.getItem(USERS_KEY);
      return usersStr ? JSON.parse(usersStr) : [];
    } catch {
      return [];
    }
  },

  // Save users to local storage
  saveUsers: (users: UserProfile[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  // Get current logged-in user
  getCurrentUser: (): UserProfile | null => {
    try {
      const currentUid = localStorage.getItem(CURRENT_USER_KEY);
      if (!currentUid) return null;
      const users = authService.getUsers();
      return users.find(u => u.uid === currentUid) || null;
    } catch {
      return null;
    }
  },

  // Listen to auth state changes (simplified mock)
  onAuthStateChanged: (callback: (user: UserProfile | null) => void) => {
    const user = authService.getCurrentUser();
    callback(user);
    
    // Create a custom event listener to simulate state changes
    const listener = () => {
      callback(authService.getCurrentUser());
    };
    window.addEventListener("authStateChanged", listener);
    
    return () => {
      window.removeEventListener("authStateChanged", listener);
    };
  },

  notifyAuthStateChanged: () => {
    window.dispatchEvent(new Event("authStateChanged"));
  },

  signIn: async (email: string, password?: string, role?: string) => {
    await new Promise(resolve => setTimeout(resolve, 800)); // simulate network
    const users = authService.getUsers();
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Auto-create user for direct access
      user = {
        uid: "local_" + Math.random().toString(36).substring(2, 9),
        email: email,
        password: password,
        role: (role as AuthRole) || "farmer",
        status: "active",
        firstName: "Guest",
        lastName: "User",
        phone: "",
        country: "Zimbabwe",
        province: "",
        district: "",
        ward: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        businessDetails: { verified: true } // Auto-verify for easy access
      };
      users.push(user);
      authService.saveUsers(users);
    } else if (role && user.role !== role) {
      // Auto-update role for direct access
      user.role = role as AuthRole;
      authService.saveUsers(users);
    }
    
    // In a real app we'd hash passwords. Here we check plain text for dev mode.
    if (password && user.password && user.password !== password) {
      throw { code: "auth/wrong-password", message: "Incorrect email or password." };
    }
    
    localStorage.setItem(CURRENT_USER_KEY, user.uid);
    localStorage.setItem("nc_jwt_token", "dev_token_123");
    authService.notifyAuthStateChanged();
    return user;
  },

  signInWithGoogle: async (role: AuthRole) => {
    const email = `google-${role}@neurocrop.local`;
    return authService.signIn(email, undefined, role);
  },

  signUp: async (userData: Partial<UserProfile>, password?: string) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const users = authService.getUsers();
    
    if (users.find(u => u.email.toLowerCase() === userData.email?.toLowerCase())) {
      throw { code: "auth/email-already-in-use", message: "Email already exists." };
    }
    
    const newUser: UserProfile = {
      ...userData,
      uid: "local_" + Math.random().toString(36).substring(2, 9),
      email: userData.email!,
      password: password,
      role: userData.role as AuthRole || "farmer",
      status: "active",
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      phone: userData.phone || "",
      country: userData.country || "Zimbabwe",
      province: userData.province || "",
      district: userData.district || "",
      ward: userData.ward || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      businessDetails: userData.businessDetails || {}
    };
    
    users.push(newUser);
    authService.saveUsers(users);
    
    localStorage.setItem(CURRENT_USER_KEY, newUser.uid);
    localStorage.setItem("nc_jwt_token", "dev_token_123");
    authService.notifyAuthStateChanged();
    return newUser;
  },

  signOut: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    localStorage.removeItem(CURRENT_USER_KEY);
    authService.notifyAuthStateChanged();
  },

  updateProfile: async (uid: string, data: Partial<UserProfile>) => {
    const users = authService.getUsers();
    const index = users.findIndex(u => u.uid === uid);
    if (index !== -1) {
      users[index] = { ...users[index], ...data, updatedAt: new Date().toISOString() };
      authService.saveUsers(users);
      
      if (localStorage.getItem(CURRENT_USER_KEY) === uid) {
        authService.notifyAuthStateChanged();
      }
    }
  }
};
