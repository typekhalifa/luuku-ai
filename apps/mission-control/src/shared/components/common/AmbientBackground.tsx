import { motion } from "framer-motion";

export default function AmbientBackground() {

    return (

        <div className="absolute inset-0 overflow-hidden pointer-events-none">

            <motion.div

                animate={{

                    x: [0, 40, 0],

                    y: [0, -30, 0],

                }}

                transition={{

                    repeat: Infinity,

                    duration: 18,

                    ease: "easeInOut",

                }}

                className="absolute left-0 top-0 h-[420px] w-[420px] rounded-full bg-indigo-600/10 blur-[170px]"

            />

            <motion.div

                animate={{

                    x: [0, -60, 0],

                    y: [0, 40, 0],

                }}

                transition={{

                    repeat: Infinity,

                    duration: 22,

                    ease: "easeInOut",

                }}

                className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[220px]"

            />

        </div>

    );

}