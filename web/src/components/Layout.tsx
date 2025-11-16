import { Outlet } from 'react-router-dom';
import Header from './Header';
import { AnimatePresence, motion } from 'framer-motion';

export default function Layout() {
    return (
        <>
            <Header />
            <AnimatePresence>
                <motion.div
                    initial={{ translateY: 20 }}
                    animate={{ translateY: 0 }}
                >
                    <Outlet />
                </motion.div>
            </AnimatePresence>
        </>
    );
}
