export type Jaculatoria = { v: string; r: string };

export type MysteryType = 'gozosos' | 'luminosos' | 'dolorosos' | 'gloriosos';

export type ImmersiveRosaryProps = {
  mysteryTitle?: string;
  mysteryGroup?: string;
  mysteryContent?: string;
  onClose: (targetId?: string) => void;
  onSwitchToMeditated?: () => void;
};
