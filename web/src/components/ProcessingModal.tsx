import React from 'react';
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import SpinnerEmpty from './SpinnerEmpty';

interface ProcessingModalProps {
    isOpen: boolean;
}

const ProcessingModal: React.FC<ProcessingModalProps> = ({ isOpen }) => {
    return (
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-md">
                <div className="flex flex-col items-center py-6">
                    <div className="relative">
                        <SpinnerEmpty />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ProcessingModal;
