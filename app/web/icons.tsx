// Path data sourced from Google's Material Symbols icon set
// (https://fonts.google.com/icons), inlined as SVG so the app doesn't need
// to load an external icon font or a large icon package at runtime.
type IconProps = { className?: string };

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 -960 960 960"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

export function IconAdd({ className }: IconProps) {
  return (
    <Icon
      className={className}
      path="M450-450H200v-60h250v-250h60v250h250v60H510v250h-60v-250Z"
    />
  );
}

export function IconBucket({ className }: IconProps) {
  return (
    <Icon
      className={className}
      path="M333-40q-22.78 0-39.87-14.7Q276.04-69.39 273-92l-73-548h560L687-92q-3.04 22.61-20.13 37.3Q649.78-40 627-40H333Zm0-60h295l63-480H269l64 480Zm225-262.08q32-32.09 32-77.92v-70h-60v70q0 21.25-14.32 35.62Q501.35-390 480.18-390q-21.18 0-35.68-14.38Q430-418.75 430-440v-70h-60v70q0 45.83 32.12 77.92 32.12 32.08 78 32.08T558-362.08ZM600-700q-20 0-35-15t-15-35.5q0-20.5 15-35t35.5-14.5q20.5 0 35 14.58Q650-770.83 650-750q0 20-14.58 35-14.59 15-35.42 15Zm-200-40q-37 0-63.5-26.5t-26.5-64q0-37.5 26.5-63.5t64-26q37.5 0 63.5 26.1t26 63.9q0 37-26.1 63.5T400-740Zm228 640H333h295Z"
    />
  );
}

export function IconFolder({ className }: IconProps) {
  return (
    <Icon
      className={className}
      path="M140-160q-24 0-42-18.5T80-220v-520q0-23 18-41.5t42-18.5h281l60 60h339q23 0 41.5 18.5T880-680v460q0 23-18.5 41.5T820-160H140Zm0-60h680v-460H456l-60-60H140v520Zm0 0v-520 520Z"
    />
  );
}

export function IconDockToRight({ className }: IconProps) {
  return (
    <Icon
      className={className}
      path="M180-120q-24.75 0-42.37-17.63Q120-155.25 120-180v-600q0-24.75 17.63-42.38Q155.25-840 180-840h600q24.75 0 42.38 17.62Q840-804.75 840-780v600q0 24.75-17.62 42.37Q804.75-120 780-120H180Zm147-60v-600H180v600h147Zm60 0h393v-600H387v600Zm-60 0H180h147Z"
    />
  );
}

export function IconDockToLeft({ className }: IconProps) {
  return (
    <Icon
      className={className}
      path="M180-120q-24.75 0-42.37-17.63Q120-155.25 120-180v-600q0-24.75 17.63-42.38Q155.25-840 180-840h600q24.75 0 42.38 17.62Q840-804.75 840-780v600q0 24.75-17.62 42.37Q804.75-120 780-120H180Zm453-60h147v-600H633v600Zm-60 0v-600H180v600h393Zm60 0h147-147Z"
    />
  );
}
