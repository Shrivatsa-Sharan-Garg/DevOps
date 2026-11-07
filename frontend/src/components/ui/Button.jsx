import {motion} from "motion/react";
import {Link} from "react-router";
import {LoaderCircle} from "lucide-react";

const MotionLink=motion.create(Link);

const PRESS={
    whileHover:{y:-1},
    whileTap:{scale:0.96},
    transition:{type:"spring",stiffness:500,damping:26}
};

function Button({variant="primary", size="", to, loading=false, disabled=false, type="button", className="", children, ...rest}){
    const classes=`btn btn-${variant} ${size ? `btn-${size}` : ""} ${className}`.trim();

    if(to){
        return <MotionLink to={to} className={classes} {...PRESS} {...rest}>{children}</MotionLink>;
    }

    return (
        <motion.button
            type={type}
            className={classes}
            disabled={disabled || loading}
            aria-busy={loading}
            {...PRESS}
            {...rest}
        >
            {loading && <LoaderCircle className="spin" size={16} aria-hidden="true"/>}
            {children}
        </motion.button>
    );
}

export default Button;
