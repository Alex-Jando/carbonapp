import type { ReactNode } from "react";

export const metadata = {
  title: "CarbonApp",
  description: "CarbonApp",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
