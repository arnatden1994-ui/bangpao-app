import React from 'react';
import { PublicPetition, SignerSettings } from '../types/index.ts';
import { PrintPetitionModal } from './PrintPetitionModal.tsx';

interface PrintA4PetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  petition: PublicPetition | null;
  savedSignerSettings?: SignerSettings;
  onUpdateSignerSettings?: (s: SignerSettings) => void;
}

export const PrintA4PetitionModal: React.FC<PrintA4PetitionModalProps> = ({
  isOpen,
  onClose,
  petition,
  savedSignerSettings,
  onUpdateSignerSettings,
}) => {
  return (
    <PrintPetitionModal
      isOpen={isOpen}
      onClose={onClose}
      petition={petition}
      savedSignerSettings={savedSignerSettings}
      onUpdateSignerSettings={onUpdateSignerSettings}
    />
  );
};
