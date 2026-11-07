const BASE_URL=import.meta.env.VITE_API_BASE_URL || "";
const USER_STORAGE_KEY="devbridge-demo-user";

class ApiError extends Error{
    constructor(message, {status=0, code="network_error", details=null, retryAfter=null}={}){
        super(message);
        this.status=status;
        this.code=code;
        this.details=details;
        this.retryAfter=retryAfter;
    }
}

export function storedUserId(){
    try{
        return localStorage.getItem(USER_STORAGE_KEY);
    }catch{
        return null;
    }
}

export function storeUserId(userId){
    try{
        if(userId){
            localStorage.setItem(USER_STORAGE_KEY, userId);
        }else{
            localStorage.removeItem(USER_STORAGE_KEY);
        }
    }catch{
        // Storage can be unavailable in private browsing.
    }
}

function buildHeaders(body){
    const headers={};
    const userId=storedUserId();

    if(body !== undefined){
        headers["Content-Type"]="application/json";
    }

    if(userId){
        headers["X-Demo-User-Id"]=userId;
    }

    return headers;
}

async function readError(response){
    const payload=await response.json().catch(() => null);
    const error=payload?.error;

    return new ApiError(error?.message || "Something went wrong. Please try again.", {
        status:response.status,
        code:error?.code || "server_error",
        details:error?.details || null,
        retryAfter:error?.retry_after ?? null
    });
}

export async function request(path, {method="GET", body, signal}={}){
    let response;

    try{
        response=await fetch(`${BASE_URL}${path}`, {
            method,
            headers:buildHeaders(body),
            body:body === undefined ? undefined : JSON.stringify(body),
            signal
        });
    }catch(error){
        if(error.name === "AbortError"){
            throw error;
        }

        throw new ApiError("The DevBridge API cannot be reached. Check that it is running.");
    }

    if(!response.ok){
        throw await readError(response);
    }

    return response.json();
}
