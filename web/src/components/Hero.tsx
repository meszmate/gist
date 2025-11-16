import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AIInput } from './Prompt';
import { Sparkles } from 'lucide-react';
import Animate from './Animate';

const HeroSection: React.FC = () => {
    return (
        <section className="relative min-h-screen overflow-hidden">
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
                <div className="text-center mb-12">
                    <Badge variant="secondary" className="mb-4 bg-neutral-50 border border-neutral-300 text-neutral-800">
                        <Sparkles className="w-4 h-4 mr-1" />
                        AI-Powered Learning
                    </Badge>

                    <h1 className="text-6xl font-semibold text-neutral-900 mb-6">
                        Transform Your Study Materials
                    </h1>

                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Upload your notes, textbooks, or any study material. Our AI will create
                        summaries, flashcards, and quiz questions to supercharge your learning.
                    </p>
                </div>

                <Animate>
                    <AIInput onSubmit={(data) => {
                        console.log(data)
                    }} />

                </Animate>
            </div>
        </section>
    );
};

export default HeroSection;
