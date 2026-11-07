import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {api} from "../api";
import {storedUserId, storeUserId} from "../api/client";

const SessionContext=createContext(null);

const THEME_KEY="devbridge-theme";
const USER_CACHE_KEY="devbridge-demo-profile";
const CONSENT_KEY="devbridge-ai-consent";

function readStorage(key){
    try{
        return localStorage.getItem(key);
    }catch{
        return null;
    }
}

function writeStorage(key, value){
    try{
        if(value === null){
            localStorage.removeItem(key);
        }else{
            localStorage.setItem(key, value);
        }
    }catch{
        // Storage can be unavailable in private browsing.
    }
}

function readCachedUser(){
    if(!storedUserId()){
        return null;
    }

    try{
        return JSON.parse(readStorage(USER_CACHE_KEY));
    }catch{
        return null;
    }
}

export function SessionProvider({children}){
    const [user, setUser]=useState(readCachedUser);
    const [signedOut, setSignedOut]=useState(false);
    const [theme, setTheme]=useState(() => readStorage(THEME_KEY) === "light" ? "light" : "dark");
    const [aiConsent, setAiConsentState]=useState(() => readStorage(CONSENT_KEY) === "accepted");

    useEffect(() => {
        document.documentElement.dataset.theme=theme;
        writeStorage(THEME_KEY, theme);
    }, [theme]);

    const signIn=useCallback((profile) => {
        storeUserId(profile.id);
        writeStorage(USER_CACHE_KEY, JSON.stringify(profile));
        setUser(profile);
        setSignedOut(false);
    }, []);

    const signOut=useCallback(() => {
        storeUserId(null);
        writeStorage(USER_CACHE_KEY, null);
        setUser(null);
        setSignedOut(true);
    }, []);

    // A demo reset can remove the stored profile.
    useEffect(() => {
        const userId=storedUserId();

        if(!userId){
            return;
        }

        api.startDemoSession(userId)
            .then(signIn)
            .catch((error) => {
                if(error.status === 404){
                    signOut();
                }
            });
    }, [signIn, signOut]);

    const startDemo=useCallback(async (userId) => {
        const profile=await api.startDemoSession(userId);

        signIn(profile);

        return profile;
    }, [signIn]);

    const register=useCallback(async (form) => {
        const profile=await api.register(form);

        signIn(profile);

        return profile;
    }, [signIn]);

    const saveProfile=useCallback(async (changes) => {
        const profile=await api.updateProfile(user.id, changes);

        signIn(profile);

        return profile;
    }, [signIn, user]);

    const setAiConsent=useCallback((accepted) => {
        writeStorage(CONSENT_KEY, accepted ? "accepted" : null);
        setAiConsentState(accepted);
    }, []);

    const toggleTheme=useCallback(() => {
        setTheme((current) => current === "dark" ? "light" : "dark");
    }, []);

    const value=useMemo(() => ({
        user,
        signedOut,
        theme,
        aiConsent,
        startDemo,
        register,
        saveProfile,
        signOut,
        setAiConsent,
        toggleTheme
    }), [user, signedOut, theme, aiConsent, startDemo, register, saveProfile, signOut, setAiConsent, toggleTheme]);

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(){
    return useContext(SessionContext);
}
