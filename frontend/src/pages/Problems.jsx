import {useEffect, useState} from "react";
import {useSearchParams} from "react-router";
import {AnimatePresence, motion} from "motion/react";
import {Plus, Search, SearchX, X} from "lucide-react";
import {api} from "../api";
import {useToast} from "../context/ToastContext";
import {useApi} from "../hooks/useApi";
import ProblemCard from "../components/problems/ProblemCard";
import Button from "../components/ui/Button";
import {Reveal} from "../components/ui/Reveal";
import {CardSkeletons, EmptyState, ErrorState} from "../components/ui/States";
import {plural, statusLabel} from "../utils/format";

const PAGE_SIZE=12;
const SEARCH_DELAY_MS=300;

const SORT_LABELS={
    trending:"Trending",
    newest:"Newest",
    most_upvoted:"Most upvoted",
    most_reported:"Most reported",
    most_solutions:"Most solutions"
};

function useFilters(){
    const [params, setParams]=useSearchParams();

    const filters={
        search:params.get("q") || "",
        category:params.get("category") || "",
        status:params.get("status") || "",
        tag:params.get("tag") || "",
        sort:params.get("sort") || "trending"
    };

    function setFilter(name, value){
        const urlName=name === "search" ? "q" : name;

        setParams((current) => {
            const next=new URLSearchParams(current);

            if(value){
                next.set(urlName, value);
            }else{
                next.delete(urlName);
            }

            return next;
        }, {replace:true});
    }

    function clearFilters(){
        setParams({}, {replace:true});
    }

    return {filters,setFilter,clearFilters};
}

function SearchBox({value, onSearch}){
    const [text, setText]=useState(value);
    const [lastValue, setLastValue]=useState(value);

    // Follow outside changes such as "Clear filters".
    if(value !== lastValue){
        setLastValue(value);
        setText(value);
    }

    useEffect(() => {
        if(text === value){
            return undefined;
        }

        const timer=setTimeout(() => onSearch(text), SEARCH_DELAY_MS);

        return () => clearTimeout(timer);
    }, [text, value, onSearch]);

    return (
        <label className="search-control">
            <Search size={17} aria-hidden="true"/>
            <input
                aria-label="Search problems"
                value={text}
                placeholder="Search problems, needs or tags"
                onChange={(event) => setText(event.target.value)}
            />
        </label>
    );
}

function Toolbar({filters, categories, statuses, setFilter}){
    return (
        <div className="toolbar surface">
            <SearchBox value={filters.search} onSearch={(value) => setFilter("search", value)}/>

            <select
                aria-label="Category"
                value={filters.category}
                onChange={(event) => setFilter("category", event.target.value)}
            >
                <option value="">All categories</option>
                {categories.map((category) => <option key={category}>{category}</option>)}
            </select>

            <select aria-label="Status" value={filters.status} onChange={(event) => setFilter("status", event.target.value)}>
                <option value="">Any status</option>
                {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>

            <select aria-label="Sort results" value={filters.sort} onChange={(event) => setFilter("sort", event.target.value)}>
                {Object.entries(SORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
        </div>
    );
}

function Problems(){
    const toast=useToast();
    const {filters, setFilter, clearFilters}=useFilters();
    const [pageState, setPageState]=useState({key:"",page:1});
    const [loadingMore, setLoadingMore]=useState(false);
    const filterKey=JSON.stringify(filters);
    const page=pageState.key === filterKey ? pageState.page : 1;
    const meta=useApi((signal) => api.meta(signal));
    const {data, error, loading, reload, setData}=useApi(
        (signal) => api.listProblems({...filters,page:1,page_size:PAGE_SIZE}, signal),
        [filterKey]
    );

    function updateProblem(problemId, changes){
        setData((current) => ({
            ...current,
            items:current.items.map((item) => item.id === problemId ? {...item,...changes} : item)
        }));
    }

    async function loadMore(){
        setLoadingMore(true);

        try{
            const next=await api.listProblems({...filters,page:page+1,page_size:PAGE_SIZE});

            setPageState({key:filterKey,page:page+1});
            setData((current) => ({...current,items:[...current.items, ...next.items]}));
        }catch(failure){
            toast.error(failure.message);
        }finally{
            setLoadingMore(false);
        }
    }

    const hasFilters=Boolean(filters.search || filters.category || filters.status || filters.tag);

    return (
        <div className="page-shell">
            <Reveal className="page-title">
                <div>
                    <span className="eyebrow">Community requests</span>
                    <h1>Explore problems</h1>
                    <p>Find a need you understand. Add your support or help shape a solution.</p>
                </div>

                <Button to="/submit"><Plus size={16} aria-hidden="true"/>Share a problem</Button>
            </Reveal>

            <Toolbar
                filters={filters}
                categories={meta.data?.categories || []}
                statuses={meta.data?.statuses || []}
                setFilter={setFilter}
            />

            <div className="results-line">
                <span>{data ? plural(data.total, "problem") : "Loading…"}</span>

                {filters.tag && (
                    <button type="button" className="filter-chip" onClick={() => setFilter("tag", "")}>
                        #{filters.tag}
                        <X size={13} aria-hidden="true"/>
                        <span className="sr-only">Remove tag filter</span>
                    </button>
                )}

                {hasFilters && <button type="button" className="text-link" onClick={clearFilters}>Clear filters</button>}
            </div>

            {loading && !data && <CardSkeletons/>}
            {error && <ErrorState error={error} onRetry={reload}/>}

            {data && data.items.length === 0 && (
                <EmptyState
                    icon={SearchX}
                    title="No problems found"
                    action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
                >
                    Try another search, or clear a filter to see more community needs.
                </EmptyState>
            )}

            {data && data.items.length > 0 && (
                <motion.div className={loading ? "card-grid is-refreshing" : "card-grid"} layout>
                    <AnimatePresence mode="popLayout">
                        {data.items.map((problem) => (
                            <motion.div
                                key={problem.id}
                                layout
                                initial={{opacity:0,y:16}}
                                animate={{opacity:1,y:0}}
                                exit={{opacity:0,scale:0.96,transition:{duration:0.12}}}
                                transition={{duration:0.24}}
                            >
                                <ProblemCard problem={problem} onChange={updateProblem}/>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {data && data.items.length < data.total && (
                <div className="load-more">
                    <Button variant="secondary" loading={loadingMore} onClick={loadMore}>Load more</Button>
                </div>
            )}
        </div>
    );
}

export default Problems;
