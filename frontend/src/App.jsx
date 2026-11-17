import {lazy} from "react";
import {Navigate, Route, Routes, useParams} from "react-router";
import AppLayout from "./components/layout/AppLayout";
import Home from "./pages/Home";

const Problems=lazy(() => import("./pages/Problems"));
const ProblemDetails=lazy(() => import("./pages/ProblemDetails"));
const SubmitProblem=lazy(() => import("./pages/SubmitProblem"));
const Solutions=lazy(() => import("./pages/Solutions"));
const SolutionDetails=lazy(() => import("./pages/SolutionDetails"));
const Dashboard=lazy(() => import("./pages/Dashboard"));
const Workspace=lazy(() => import("./pages/Workspace"));
const NotFound=lazy(() => import("./pages/NotFound"));
const Networks=lazy(() => import("./pages/Networks"));
const Coa=lazy(() => import("./pages/Coa"));
const Login=lazy(() => import("./pages/Auth").then((module) => ({default:module.Login})));
const Register=lazy(() => import("./pages/Auth").then((module) => ({default:module.Register})));

function LegacyWorkspaceRedirect(){
    const {section}=useParams();

    return <Navigate to={`/workspace/${section}`} replace/>;
}

function App(){
    return (
        <Routes>
            <Route element={<AppLayout/>}>
                <Route index element={<Home/>}/>
                <Route path="problems" element={<Problems/>}/>
                <Route path="problems/:id" element={<ProblemDetails/>}/>
                <Route path="submit" element={<SubmitProblem/>}/>
                <Route path="solutions" element={<Solutions/>}/>
                <Route path="solutions/:id" element={<SolutionDetails/>}/>
                <Route path="dashboard" element={<Dashboard/>}/>
                <Route path="dashboard/:section" element={<LegacyWorkspaceRedirect/>}/>
                <Route path="workspace" element={<Workspace/>}/>
                <Route path="workspace/:section" element={<Workspace/>}/>
                <Route path="profile" element={<Navigate to="/workspace/profile" replace/>}/>
                <Route path="networks" element={<Networks/>}/>
                <Route path="networks/:module" element={<Networks/>}/>
                <Route path="coa" element={<Coa/>}/>
                <Route path="coa/:module" element={<Coa/>}/>
                <Route path="login" element={<Login/>}/>
                <Route path="register" element={<Register/>}/>
                <Route path="*" element={<NotFound/>}/>
            </Route>
        </Routes>
    );
}

export default App;
