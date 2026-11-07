export function formatDate(value){
    return new Date(value).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"});
}

export function splitList(text){
    return text
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
}

export function shortText(text, length){
    if(text.length <= length){
        return text;
    }

    return `${text.slice(0, length).trimEnd()}…`;
}

export function statusLabel(status){
    if(status === "in-progress"){
        return "In progress";
    }

    if(status === "solved"){
        return "Solved";
    }

    return "Open";
}

export function plural(count, word, pluralWord=`${word}s`){
    return `${count} ${count === 1 ? word : pluralWord}`;
}

export function initialOf(name){
    return (name || "?").charAt(0).toUpperCase();
}

export function createRequestId(){
    return crypto.randomUUID();
}

export function formatWait(seconds){
    if(!seconds){
        return "";
    }

    if(seconds < 90){
        return `about ${seconds} seconds`;
    }

    const minutes=Math.round(seconds/60);

    if(minutes < 90){
        return `about ${minutes} minutes`;
    }

    return `about ${Math.round(minutes/60)} hours`;
}
