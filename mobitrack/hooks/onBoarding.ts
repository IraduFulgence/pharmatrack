import { create } from "zustand";
import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'pharmatrack_hasSeen_welcome';

interface onboardingState {
    hasSeenWelcome: boolean | null;
    isLoading:boolean;
    completeOnboarding: () => Promise<void>;
    checkOnboardingStatus: () => Promise<void>;

}

export const useOnboardingStore = create<onboardingState>((set) => ({
    hasSeenWelcome:null,
    isLoading:true,

        // we call this function if user finishes on boarding process

completeOnboarding : async () => {
    try {
        await SecureStore.setItemAsync(ONBOARDING_KEY,'true');
        set({hasSeenWelcome: true});
    } catch (error) {
        console.error('Failed to save on boarding status',error);
    }
},

// we call this to check in storage
checkOnboardingStatus: async () =>{


    try {
        const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
        set({hasSeenWelcome: value ==='true',isLoading:false});
    } catch (error) {
        set({hasSeenWelcome:false, isLoading:false});
    }
},

}));
