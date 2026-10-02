// Reduced motion: on if the user turned on the setting OR their OS asks for less motion.

const osPrefersLess = window.matchMedia('(prefers-reduced-motion: reduce)');
let fromSetting = false;

export const motion = {
  get reduced(): boolean {
    return fromSetting || osPrefersLess.matches;
  },
};

export function setReducedMotionSetting(value: boolean): void {
  fromSetting = value;
}
