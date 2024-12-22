export const metadata = {
  title: 'Mitra Da Dhaba',
  description: 'Restaurant Menu System',
}

import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}