import React from "react";
import { Icon, IconProvider } from "../ui/Icon";
import { OnboardingChoiceCard } from "../../shared/ui/ExtractedSurfacePrimitives";

interface ModeCardProps {
  iconName: string;
  iconProvider?: IconProvider;
  title: string;
  description: string;
  onClick: () => void;
}

/**
 * Glassmorphic mode selection card
 * Theme-aware with support for light and dark modes
 */
const ModeCard: React.FC<ModeCardProps> = ({
  iconName,
  iconProvider,
  title,
  description,
  onClick,
}) => {
  return (
    <OnboardingChoiceCard
      title={title}
      description={description}
      onClick={onClick}
    >
      <div className="relative z-10">
        <div className="mb-2 sm:mb-4 group-hover:scale-110 transition-transform duration-300 flex justify-center">
          <Icon
            name={iconName} 
            provider={iconProvider} 
            variant="Linear"
            className="w-12 h-12 sm:w-16 sm:h-16"
            color="var(--app-text-main)"
          />
        </div>
      </div>
    </OnboardingChoiceCard>
  );
};

export default ModeCard;
