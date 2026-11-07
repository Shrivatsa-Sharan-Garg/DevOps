import {useCallback, useEffect, useRef, useState} from "react";

export function useApi(fetcher, deps=[]){
    const [attempt, setAttempt]=useState(0);
    const [state, setState]=useState({key:null,data:null,error:null});
    const fetcherRef=useRef(fetcher);
    const requestKey=`${JSON.stringify(deps)}:${attempt}`;

    useEffect(() => {
        fetcherRef.current=fetcher;
    });

    useEffect(() => {
        const controller=new AbortController();

        fetcherRef.current(controller.signal)
            .then((data) => {
                setState({key:requestKey,data,error:null});
            })
            .catch((error) => {
                if(error.name !== "AbortError"){
                    setState({key:requestKey,data:null,error});
                }
            });

        return () => {
            controller.abort();
        };
    }, [requestKey]);

    const reload=useCallback(() => {
        setAttempt((value) => value+1);
    }, []);

    const setData=useCallback((update) => {
        setState((current) => ({
            ...current,
            data:typeof update === "function" ? update(current.data) : update
        }));
    }, []);

    const loading=state.key !== requestKey;

    return {
        data:state.data,
        error:loading ? null : state.error,
        loading,
        reload,
        setData
    };
}
