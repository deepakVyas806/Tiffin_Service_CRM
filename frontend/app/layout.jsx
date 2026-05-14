import "@/index.css";
import "@/App.css";

export const metadata = {
  title: "Tiffin Service CRM",
  description: "Tiffin service customer and admin dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
