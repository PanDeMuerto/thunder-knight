/**
 * Queen Ada (M10, GDD §2: young, determined): KayKit's rogue in her cape (the mage read as a young man), her green
 * turned Larkmoor's royal blue (the banner's), a gold crown made in code, sized for KayKit's big heads. Her blue, cape
 * and crown set her apart from Rosie in teal (her hair shares its hue with her skin, so it stays auburn). Metres; hues
 * in degrees.
 */
export const ADA_LOOK = {
  height: 1.65,
  /** The rogue's greens, turned royal blue. */
  robe: { from: 70, to: 175, hue: 218, saturation: 1.15, light: 1.35 },
  crown: { color: 0xf2b632, radius: 0.24, band: 0.09, point: 0.11, above: 0.7 },
} as const;
