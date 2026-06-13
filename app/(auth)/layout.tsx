export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center px-4">
      {children}
    </main>
  )
}
