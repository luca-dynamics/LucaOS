import { useClock } from "@shopify/react-native-skia";

export function useOrbAnimation() {
  const clock = useClock();

  return {
    time: clock,
  };
}
