import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {api} from "../api";
import {onUnauthorized, storedToken, storeToken} from "../api/client";

const SessionContext=createContext(null);

const THEME_KEY="devbridge-theme";
const USER_CACHE_KEY="devbridge-user";
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
    if(!storedToken()){
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

    const rememberUser=useCallback((profile) => {
        writeStorage(USER_CACHE_KEY, JSON.stringify(profile));
        setUser(profile);
        setSignedOut(false);
    }, []);

    const startSession=useCallback((session) => {
        storeToken(session.token);
        rememberUser(session.user);

        return session.user;
    }, [rememberUser]);

    const clearSession=useCallback(() => {
        storeToken(null);
        writeStorage(USER_CACHE_KEY, null);
        setUser(null);
    }, []);

    const signOut=useCallback(() => {
        api.logout().catch(() => null);
        clearSession();
        setSignedOut(true);
    }, [clearSession]);

    useEffect(() => {
        onUnauthorized(clearSession);

        return () => onUnauthorized(null);
    }, [clearSession]);

    // An expired token or a database reset can invalidate the stored session.
    useEffect(() => {
        if(!storedToken()){
            return;
        }

        api.me()
            .then(rememberUser)
            .catch((error) => {
                if(error.status === 401){
                    clearSession();
                }
            });
    }, [rememberUser, clearSession]);

    const login=useCallback(async (credentials) => {
        return startSession(await api.login(credentials));
    }, [startSession]);

    const register=useCallback(async (form) => {
        return startSession(await api.register(form));
    }, [startSession]);

    const saveProfile=useCallback(async (changes) => {
        const profile=await api.updateProfile(user.id, changes);

        rememberUser(profile);

        return profile;
    }, [rememberUser, user]);

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
        login,
        register,
        saveProfile,
        signOut,
        setAiConsent,
        toggleTheme
    }), [user, signedOut, theme, aiConsent, login, register, saveProfile, signOut, setAiConsent, toggleTheme]);

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(){
    return useContext(SessionContext);
}
