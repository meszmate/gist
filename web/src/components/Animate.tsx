import type React from "react";
import { motion } from "framer-motion"

export default function Animate({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ translateY: 10, transitionDuration: 0.5 }}
            animate={{ translateY: 0, transitionDuration: 0.5 }}
        >
            {children}
        </motion.div>
    )
}
