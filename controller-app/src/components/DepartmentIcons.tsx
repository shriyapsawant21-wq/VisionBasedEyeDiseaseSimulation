import Svg, { Circle, Path } from "react-native-svg";

export type DepartmentIconName = "retina" | "cataract" | "neuro" | "glaucoma";

/**
 * Flat white glyphs, one per department card. Plain silhouettes rather than
 * emoji so every platform renders the same shape - emoji glyphs differ across
 * Android/iOS/web font sets and looked inconsistent on the department cards.
 */
export function DepartmentIcon({ name, size = 32 }: { name: DepartmentIconName; size?: number }) {
  switch (name) {
    case "retina":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M1 12C1 12 5 5 12 5C19 5 23 12 23 12C23 12 19 19 12 19C5 19 1 12 1 12Z"
            fill="#FFFFFF"
          />
          <Circle cx="12" cy="12" r="3.6" fill="#7B1E1A" />
        </Svg>
      );
    case "cataract":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="6.5" cy="14" r="4" stroke="#FFFFFF" strokeWidth={2} />
          <Circle cx="17.5" cy="14" r="4" stroke="#FFFFFF" strokeWidth={2} />
          <Path d="M10.3 12.5C10.9 11.2 13.1 11.2 13.7 12.5" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
          <Path d="M2.5 12L1 9.5" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
          <Path d="M21.5 12L23 9.5" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case "neuro":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3.3C10 1.9 6.7 2.8 6.2 5C4.3 5.3 3 7.1 3.4 8.9C2 9.7 1.6 11.6 2.6 12.9C1.9 14.3 2.5 16 3.9 16.7C3.9 18.3 5.3 19.5 6.9 19.3C7.6 20.5 9.3 21 10.6 20.2C11 19.9 11.2 19.6 11.4 19.2C11.6 18.6 12 18.5 12 17.9V3.3Z"
            fill="#FFFFFF"
          />
          <Path
            d="M12 3.3C14 1.9 17.3 2.8 17.8 5C19.7 5.3 21 7.1 20.6 8.9C22 9.7 22.4 11.6 21.4 12.9C22.1 14.3 21.5 16 20.1 16.7C20.1 18.3 18.7 19.5 17.1 19.3C16.4 20.5 14.7 21 13.4 20.2C13 19.9 12.8 19.6 12.6 19.2C12.4 18.6 12 18.5 12 17.9V3.3Z"
            fill="#FFFFFF"
            opacity={0.75}
          />
          <Path d="M12 3.5V18.5" stroke="#7B1E1A" strokeWidth={1.3} strokeLinecap="round" />
        </Svg>
      );
    case "glaucoma":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2C12 2 5 11 5 15.5C5 19.6 8.1 22 12 22C15.9 22 19 19.6 19 15.5C19 11 12 2 12 2Z"
            fill="#FFFFFF"
          />
          <Path
            d="M9 16.5C9 14.8 10.2 13.5 11.5 13"
            stroke="#3E6868"
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      );
  }
}
