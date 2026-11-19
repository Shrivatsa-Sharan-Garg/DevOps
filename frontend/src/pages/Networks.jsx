import { Navigate, useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import ApplicationModule from "../components/networks/ApplicationModule";
import DataLinkModule from "../components/networks/DataLinkModule";
import NetworkModule from "../components/networks/NetworkModule";
import PhysicalModule from "../components/networks/PhysicalModule";
import TransportModule from "../components/networks/TransportModule";
import { Reveal } from "../components/ui/Reveal";
import { ModuleTabs } from "../components/sim/SimParts";

const MODULES = [
  {
    id: "physical",
    number: 1,
    title: "Introduction and Physical Layer",
    component: PhysicalModule,
  },
  {
    id: "data-link",
    number: 2,
    title: "Data Link Layer and LANs",
    component: DataLinkModule,
  },
  {
    id: "network",
    number: 3,
    title: "Network Layer",
    component: NetworkModule,
  },
  {
    id: "transport",
    number: 4,
    title: "Transport Layer",
    component: TransportModule,
  },
  {
    id: "application",
    number: 5,
    title: "Application Layer",
    component: ApplicationModule,
  },
];

function Networks() {
  const { module = "physical" } = useParams();
  const navigate = useNavigate();
  const active = MODULES.find((item) => item.id === module);

  if (!active) {
    return <Navigate to="/networks" replace />;
  }

  const Module = active.component;

  return (
    <div className="page-shell simulations">
      <Reveal className="page-title">
        <div>
          <span className="eyebrow">Computer Networks</span>
          <h1>Computer Networks</h1>
          <p>
            Interactive simulations for the five course modules. Change the
            inputs and watch what the protocols do.
          </p>
        </div>
      </Reveal>

      <ModuleTabs
        label="networks-modules"
        modules={MODULES}
        active={active.id}
        onChange={(id) => navigate(`/networks/${id}`)}
      />

      <motion.div
        key={active.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Module />
      </motion.div>
    </div>
  );
}

export default Networks;
