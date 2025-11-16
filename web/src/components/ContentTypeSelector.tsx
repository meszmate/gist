import React from 'react';
import { Check } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ContentType {
    id: string;
    label: string;
    icon: React.ElementType;
    description: string;
}

interface ContentTypeSelectorProps {
    contentTypes: ContentType[];
    selectedTypes: string[];
    onSelectionChange: (types: string[]) => void;
}

const ContentTypeSelector: React.FC<ContentTypeSelectorProps> = ({
    contentTypes,
    selectedTypes,
    onSelectionChange
}) => {
    const toggleType = (typeId: string) => {
        if (selectedTypes.includes(typeId)) {
            onSelectionChange(selectedTypes.filter(type => type !== typeId));
        } else {
            onSelectionChange([...selectedTypes, typeId]);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
                What would you like to create?
            </label>

            <div className="grid md:grid-cols-3 gap-4">
                {contentTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedTypes.includes(type.id);

                    return (
                        <Card
                            key={type.id}
                            onClick={() => toggleType(type.id)}
                            className={`p-4 cursor-pointer transition-all duration-200 border-2 ${isSelected
                                    ? 'border-purple-500 bg-purple-50 shadow-md'
                                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <Icon className={`w-6 h-6 ${isSelected ? 'text-purple-600' : 'text-gray-500'}`} />
                                {isSelected && (
                                    <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>

                            <h3 className={`font-semibold mb-1 ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>
                                {type.label}
                            </h3>
                            <p className={`text-sm ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>
                                {type.description}
                            </p>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default ContentTypeSelector;
