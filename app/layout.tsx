import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BerryCake Analytics",
  description: "BerryCake order analytics dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
