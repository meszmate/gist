import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import SpinnerEmpty from './SpinnerEmpty';

interface ProcessingModalProps {
    isOpen: boolean;
}

const ProcessingModal: React.FC<ProcessingModalProps> = ({ isOpen }) => {
    const { t } = useTranslation();

    return (
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-md">
                <div className="flex flex-col items-center py-6">
                    <div className="relative">
                        <SpinnerEmpty />
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                        {t('processing.generating')}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ProcessingModal;
