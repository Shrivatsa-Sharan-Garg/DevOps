import {request} from "./client";

function toQuery(params){
    const query=new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if(value !== "" && value !== null && value !== undefined){
            query.set(key, value);
        }
    });

    const text=query.toString();

    return text ? `?${text}` : "";
}

export const api={
    meta:(signal) => request("/api/meta", {signal}),
    dashboard:(signal) => request("/api/dashboard", {signal}),

    listProblems:(params, signal) => request(`/api/problems${toQuery(params)}`, {signal}),
    getProblem:(id, signal) => request(`/api/problems/${encodeURIComponent(id)}`, {signal}),
    toggleUpvote:(id) => request(`/api/problems/${encodeURIComponent(id)}/upvote`, {method:"POST"}),
    toggleFollow:(id) => request(`/api/problems/${encodeURIComponent(id)}/follow`, {method:"POST"}),
    addComment:(id, text) => request(`/api/problems/${encodeURIComponent(id)}/comments`, {method:"POST",body:{text}}),
    addSolution:(id, body) => request(`/api/problems/${encodeURIComponent(id)}/solutions`, {method:"POST",body}),

    analyzeSubmission:(body) => request("/api/submissions/analyze", {method:"POST",body}),
    decideSubmission:(sessionId, body) => request(`/api/submissions/${encodeURIComponent(sessionId)}/decision`, {method:"POST",body}),

    getSrs:(id, version, signal) => request(`/api/problems/${encodeURIComponent(id)}/srs${toQuery({version})}`, {signal}),
    generateSrs:(id, aiConsent) => request(`/api/problems/${encodeURIComponent(id)}/srs`, {method:"POST",body:{ai_consent:aiConsent}}),
    updateSrs:(id, version, body) => request(`/api/problems/${encodeURIComponent(id)}/srs/${version}`, {method:"PUT",body}),

    listSolutions:(signal) => request("/api/solutions", {signal}),
    getSolution:(id, signal) => request(`/api/solutions/${encodeURIComponent(id)}`, {signal}),

    login:(body) => request("/api/auth/login", {method:"POST",body}),
    register:(body) => request("/api/auth/register", {method:"POST",body}),
    logout:() => request("/api/auth/logout", {method:"POST"}),
    me:(signal) => request("/api/auth/me", {signal}),
    demoAccounts:(signal) => request("/api/auth/demo-accounts", {signal}),
    updateProfile:(id, body) => request(`/api/users/${encodeURIComponent(id)}`, {method:"PATCH",body}),
    workspace:(signal) => request("/api/workspace", {signal})
};
