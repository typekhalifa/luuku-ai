import { animate, motion, useMotionValue } from "framer-motion";
import { useEffect, useState } from "react";

interface AnimatedCounterProps {

    value: number;

}

export default function AnimatedCounter({

    value,

}: AnimatedCounterProps) {

    const count = useMotionValue(0);

    const [display, setDisplay] = useState(0);

    useEffect(() => {

        const controls = animate(

            count,

            value,

            {

                duration: .8,

                onUpdate(v) {

                    setDisplay(Math.floor(v));

                },

            }

        );

        return () => controls.stop();

    }, [count, value]);

    return (

        <motion.span>

            {display}

        </motion.span>

    );

}